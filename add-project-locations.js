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
updateProjectsWithLocation();
