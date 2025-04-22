const fs = require('fs');
const pdfParse = require('pdf-parse');

function generateFilters(projects, userType = 'guest') {
  const filters = {
    Country: [...new Set(projects.map(project => project.country).sort((a, b) => a.localeCompare(b)))],
    Status: [...new Set(projects.map(project => String(project.status))
      .filter((status) => ['2', '3', '4', '5'].includes(status))
      .sort((a, b) => a - b))],
    Type: [...new Set(projects.map(project => project.type).sort((a, b) => a.localeCompare(b)))],
    Category: [...new Set(projects.map(project => project.category).sort((a, b) => a.localeCompare(b)))],
    "Account Name": [...new Set(projects.map(project => project.account_name).sort((a, b) => a.localeCompare(b)))],
    Credits: projects.some(project => project.credits) ? ["Available"] : []
  }
  if (userType === 'developer') {
    delete filters['Account Name']
  }
  if (userType === 'trader') {
    delete filters['Credits']
  }
  return filters;
}

function getProjectByName(projects, projectName) {
  return projects.find(project => project.name.toLowerCase().replace(/\s+/g, '-') === projectName?.toLowerCase());
}

function filterProjects(projects, sessionData) {
  const data = sessionData.filterKeys.reduce((acc, key) => ({
    ...acc,
    [key]: key === 'searchString' ? (sessionData[key] || '') : (sessionData[key] || [])
  }), {});

  return projects.filter(project => {
    let matchesSearch = true;
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');
    if (data.searchString && sessionData.searchBy) {
      const projectField = String(project[sessionData.searchBy] || '');
      matchesSearch = normalize(projectField).includes(normalize(data.searchString));
    }

    const matchesFilters = Object.entries(data).every(([key, val]) => {
      if (key === 'credits' && Array.isArray(val) && val.length > 0) {
        return parseNumber(project.pius_listed) > 0 || parseNumber(project.verified_listed) > 0;
      } else if (Array.isArray(val) && val.length > 0) {
        return val.includes(String(project[key] ?? ''))
      } else {
        return true; // no filter applied
      }
    });

    return matchesSearch && matchesFilters;
  });
};

function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = 'xxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
  return timestamp + random;
};

async function lookupCompany(companyNumber, apiKey) {
  const url = `https://api.company-information.service.gov.uk/search/companies?q=${companyNumber}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64'),
    },
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();
  return data.items?.[0] || null;
}

const accountQuestions = [
  'First Name',
  'Last Name',
  'Email',
  'Phone Number',
];

function updateRegistrationResponses(req, responses) {
  const responsesArray = Array.isArray(responses) ? responses : [responses];
  req.session.data = req.session.data ?? {};
  req.session.data.registration = req.session.data.registration ?? {};
  req.session.data.registration.responses = req.session.data.registration.responses ?? [];
  req.session.data.registration.accountResponses = req.session.data.registration.accountResponses ?? [];


  // Process each response
  responsesArray.forEach(response => {
    const { label, value, changeUrl } = response;
    const responses = accountQuestions.includes(label)
      ? req.session.data.registration.accountResponses
      : req.session.data.registration.responses;
    const existingIndex = responses.findIndex(
      item => item.label === label
    );

    if (existingIndex >= 0) {
      // Update existing entry
      responses[existingIndex].value = value;
    } else {
      // Add new entry
      responses.push({
        label,
        value,
        changeUrl
      });
    }
  });
}

function getProjectViewModel(project) {
  const numPages = parseInt(Math.random() * 100);
  return {
    ...project,
    documents: project.documents.map(doc => ({
      url: doc,
      name: doc.replaceAll('_', ' ').replace('.pdf', '').replace('.docx', '').replace('.xlsx', '').replace('.xls', ''),
      type: doc.endsWith('.pdf') ? 'pdf' : doc.endsWith('.docx') ? 'word' : 'excel',
      size: doc.endsWith('.pdf') ? '1.2MB' : doc.endsWith('.docx') ? '500KB' : '2.5MB',
      description: doc.endsWith('.pdf') ? `${numPages} page PDF` : doc.endsWith('.docx') ? `${numPages} page Word Document` : 'XLSX Spreadsheet',
    })),
  };
}

async function extractPdfText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  return pdfData.text;
}

function extractGridRefs(text) {
  // Match patterns like "NH123456", "ST 123456", "EH123 456", etc.
  const matches = text.match(/\b[A-Z]{2}\s?\d{3}\s?\d{3}\b/g);
  return matches || [];
}

function formatNumberWithCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseNumber(str) {
  return parseInt((str || "0").replace(/,/g, ""), 10);
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  generateFilters,
  filterProjects,
  getProjectByName,
  lookupCompany,
  updateRegistrationResponses,
  getProjectViewModel,
  extractPdfText,
  generateObjectId,
  extractGridRefs,
  formatNumberWithCommas,
  parseNumber,
  toTitleCase,
};
