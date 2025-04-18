const fs = require('fs');
const pdfParse = require('pdf-parse');

function generateFilters(projects) {
  return {
    Country: [...new Set(projects.map(project => project.country).sort((a, b) => a.localeCompare(b)))],
    Status: [...new Set(projects.map(project => String(project.status))
      .filter((status) => ['2', '3', '4', '5'].includes(status))
      .sort((a, b) => a - b))],
    Type: [...new Set(projects.map(project => project.type).sort((a, b) => a.localeCompare(b)))],
    Category: [...new Set(projects.map(project => project.category).sort((a, b) => a.localeCompare(b)))],
    "Account Name": [...new Set(projects.map(project => project.account_name).sort((a, b) => a.localeCompare(b)))],
    Credits: projects.some(project => project.credits) ? ["Available"] : []
  };
}

function getProject(projects, projectName) {
  return projects.find(project => project.name.toLowerCase().replace(/\s+/g, '-') === projectName.toLowerCase());
}

function filterProjects(projects, sessionData) {
  const data = sessionData.filterKeys.reduce((acc, key) => ({
    ...acc,
    [key]: key === 'searchString' ? (sessionData[key] || '') : (sessionData[key] || [])
  }), {});

  return projects.filter(project => {
    let matchesSearch = true;
    let matchesFilters = true;
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');

    Object.entries(data).forEach(([key, val]) => {
      if (key === 'searchString' && sessionData.searchBy) {
        matchesSearch = normalize(String(project[sessionData.searchBy])).includes(normalize(val));
      } else if (key === 'credits' && Array.isArray(val) && val.length > 0) {
        matchesFilters = Boolean(project.credits);
      } else if (Array.isArray(val) && val.length > 0) {
        matchesFilters = val.includes(String(project[key] ?? ''))
      }
    });

    return matchesSearch && matchesFilters;
  });
}

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

module.exports = {
  generateFilters,
  filterProjects,
  getProject,
  lookupCompany,
  updateRegistrationResponses,
  extractGridRefs,
  extractPdfText
};
