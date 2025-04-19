require('dotenv').config();
const fs = require('fs');
const proj4 = require('proj4');

// Define the projection for OSGB36 to WGS84
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs");

// Load the API key from the .env file
const apiKey = process.env.OS_API_KEY;

// Function to fetch coordinates from the OS Places API
async function getCoordinatesFromAddress(address) {
  const endpoint = `https://api.os.uk/search/places/v1/find?key=${apiKey}&query=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const { DPA } = data.results[0];
      const [longitude, latitude] = proj4(
        "EPSG:27700", // OSGB36
        "EPSG:4326", // WGS84
        [DPA.X_COORDINATE, DPA.Y_COORDINATE]
      );
      return { latitude, longitude };
    } else {
      throw new Error("No results found for the given address.");
    }
  } catch (error) {
    console.error(`Failed to fetch coordinates for address "${address}":`, error);
    return null;
  }
}

//Function to convert grid reference to easting norting
function osgrToEN(osgr) {
  const letterMap = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'; // I is skipped

  const gridRef = osgr.toUpperCase().replace(/\s+/g, ''); // strips all whitespace
  const firstLetter = gridRef.charAt(0);
  const secondLetter = gridRef.charAt(1);
  const numbers = gridRef.slice(2);
  const digits = numbers.length / 2;
  const l1 = letterMap.indexOf(firstLetter);
  const l2 = letterMap.indexOf(secondLetter);

  if (l1 === -1 || l2 === -1) {
    throw new Error(`Invalid grid letters: ${let1}${let2}`);
  }
  const offset = {
    'e': 1000 * 1000,
    'n': 500 * 1000
  }
  const grid500k = {
    'e': (l1 % 5) * 500 * 1000,
    'n': (4 - Math.floor(l1 / 5)) * 500 * 1000
  }
  const grid100k = {
    'e': (l2 % 5) * 100 * 1000,
    'n': (4 - Math.floor(l2 / 5)) * 100 * 1000
  }
  const grid100m = {
    'e': parseInt(numbers.slice(0, digits)) * 100,
    'n': parseInt(numbers.slice(digits)) * 100
  }

  const easting = grid500k.e + grid100k.e + grid100m.e - offset.e;
  const northing = grid500k.n + grid100k.n + grid100m.n - offset.n;

  return { easting, northing }
}

// Get location from grid refernce
async function getLocationFromGridRef(gridRef) {
  // const { easting, northing } = osgrToEN(gridRef.replace(/\s+/g, ''));
  // const endpoint = `https://api.os.uk/search/places/v1/nearest?key=${apiKey}&point=${easting},${northing}&radius=1000`;
  const endpoint = `https://api.os.uk/search/places/v1/find?key=${apiKey}&query=${gridRef}`;

  const countryCode = {
    'E': 'England',
    'W': 'Wales',
    'S': 'Scotland',
    'N': 'Northern Ireland',
  }
  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const [longitude, latitude] = proj4(
        "EPSG:27700", // OSGB36
        "EPSG:4326", // WGS84
        [result.DPA.X_COORDINATE, result.DPA.Y_COORDINATE]
      );

      return {
        'country': countryCode[result.DPA.COUNTRY_CODE] ?? '',
        'state/province/county': result.DPA.POST_TOWN ?? '',
        'zip/postal_code': result.DPA.POSTCODE ?? '',
        'longitude': longitude ?? '',
        'latitude': latitude ?? '',
        'address': result.DPA.ADDRESS ?? '',
        'nearest_town': result.DPA.POST_TOWN ?? '',
        'grid_reference': gridRef,
      };
    } else {
      console.warn('No results found for grid reference');
      return null;
    }
  } catch (err) {
    console.error('Error fetching OS data:', err);
    return null;
  }
}

// Main function to update projects.json
async function updateProjectsWithLocation() {
  const filePath = 'app/assets/data/projects.json';

  // Read the projects.json file
  const projects = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Loop through each project and add the location property
  for (const project of projects) {
    if (!project.location) {
      console.log(`Fetching coordinates for project: ${project.name}`);
      const coordinates = await getCoordinatesFromAddress(project.address);
      if (coordinates) {
        project.location = coordinates;
      } else {
        console.warn(`Could not fetch coordinates for project: ${project.name}`);
      }
    }
  }

  // Write the updated projects back to the file
  fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));
  console.log('Projects updated with location data.');
}

// Run the script
// updateProjectsWithLocation();
// getLocationFromGridRef('ST 179 764');
// getLocationFromGridRef('NH 291 162');
// console.log(osgrToEN('TQ301804'));
// console.log(osgrToEN('NH291162'));
module.exports = { getLocationFromGridRef }