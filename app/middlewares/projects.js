const path = require('path');
const projects = require('../assets/data/projects.json');
const formGroups = require('../assets/data/formGroups.json')
const {
  generateFilters,
  filterProjects,
  getProjectByName,
  extractPdfText,
  extractGridRefs,
  getProjectViewModel,
  formatNumberWithCommas,
  parseNumber
} = require('../helpers');

const { getLocationFromGridRef } = require('../../scripts/add-project-locations.js');

//projects
function applyProjectFilters(req, res, next) {
  const defaultProjects = res.locals.defaultProjects || projects;
  res.locals.filteredProjects = filterProjects(defaultProjects, req.session.data);
  res.locals.projectFilters = generateFilters(defaultProjects, req.session.userType);
  next();
}

function getProject(req, res, next) {
  const projectName = req.params.name;
  const project = getProjectByName(projects, projectName);
  if (!project) {
    return res.status(404).redirect('/error-page-not-found');
  }

  res.locals.project = getProjectViewModel(project);
  next();
}

async function resetProjectFields(req, _, next) {
  if (req.body.reset) {
    req.session.data.project.responses = {}
    req.session.data.fieldId = '1';
  }
  next();
}

function getFormGroupStatus(req, res, next) {
  const responses = req.session.data?.project?.responses || {};

  // Group fields by formGroupId
  const groupStatus = {};

  const groupedFields = formGroups.reduce((acc, field) => {
    if (!acc[field.formGroupId]) acc[field.formGroupId] = [];
    acc[field.formGroupId].push(field);
    return acc;
  }, {});

  for (const groupId in groupedFields) {
    const fields = groupedFields[groupId];
    const total = fields.length;
    let filled = 0;

    fields.forEach(field => {
      const value = responses[field.key];
      if (value !== undefined && value !== null && value !== '') {
        filled++;
      }
    });

    if (filled === 0) {
      groupStatus[groupId] = 0; // not started
    } else if (filled < total) {
      groupStatus[groupId] = 1; // incomplete
    } else {
      groupStatus[groupId] = 2; // completed
    }
  }

  req.session.data.project.status = groupStatus;
  next();
}

function updateProjectResponses(req, _, next) {
  const projectFields = req.session.data.projectFields || [];
  const responses = req.session.data.project?.responses || {};
  const updatedResponses = projectFields.reduce((acc, key) => {
    const value = req.session.data[key];
    if (value) {
      acc[key] = value;
      delete req.session.data[key];
    } else if (responses[key]) {
      acc[key] = responses[key];
    }

    return acc;
  }, {});

  req.session.data.project = {
    ...(req.session.data.project || {}),
    responses: {
      ...responses,
      ...updatedResponses
    }
  };

  next();
}

function projectResponseValidate(req, res, next) {
  const { lastFieldId } = req.query;

  const project = req.session.data?.project || {};
  const standardPeatland = project.standard === "UK Peatland Code";
  const excludedKey = standardPeatland ? '3' : '5';
  const projectResponseValidated = Object.keys(project.status)
    .filter(key => key !== excludedKey)
    .every(key => project.status[key] == 2);

  Object.assign(req.session.data, {
    ...(lastFieldId ?? {}),
    projectResponseValidated
  });

  if (lastFieldId) {
    return res.redirect('/developer/create-project/answer-summary');
  }
  next();
}

async function getProjectSiteDetails(req, res, next) {
  const file = req.file;
  if (!file) {
    req.session.data.formError = {
      message: `No file selected. Please select a file to continue.`
    }
    return res.redirect('/developer/create-project/document-upload');
  }
  const filePath = file.path;
  const ext = path.extname(file.originalname).toLowerCase();
  const existingProject = req.session.data.project || {};

  const fileData = {
    filePath,
    ext,
    name: file.originalname,
    filename: file.filename,
    size: (file.size / 1024).toFixed(2) // Convert to KB
  };

  let responses = { ...existingProject.responses, files: [...(existingProject.responses?.files || []), fileData]};

  try {
    if (ext === '.pdf') {
      const rawText = await extractPdfText(filePath);
      const nhCode = extractGridRefs(rawText)[0];
      const siteDetails = await getLocationFromGridRef(nhCode);

      if (!siteDetails) {
        responses = { ...responses, pdfFile: true };
        req.session.data.project = { ...existingProject, responses };
        return res.redirect('/developer/create-project?bannerState=documentSuccess');
      }

      responses = { ...responses, ...siteDetails, pdfFile: true };
    } else if (ext.toLowerCase() === '.xlsx' || ext.toLowerCase() === '.csv') {

      // add it here...
      responses = { ...responses, csvFile: true };
      req.session.data.project = { ...existingProject, responses };
      return res.redirect('/developer/create-project?bannerState=documentSuccess');
    }

    req.session.data.project = { ...existingProject, responses };
    next();
  } catch (err) {
    return res.redirect('/developer/create-project?bannerState=documentSuccess');
  }
}

function filterDeveloperProjects(req, res, next) {
  let localProjects = res.locals.projects || projects;

  if (req.session.data.updatedProject) {
    const updated = req.session.data.updatedProject;

    localProjects = localProjects.map(project => {
      return project.id === updated.id ? { ...project, ...updated } : project;
    });

    res.locals.updatedProject = updated;
    delete req.session.data.updatedProject;
  }

  const accountNames = new Set(res.locals.filteredAccounts?.map(a => a.account_name));
  const filteredProjects = localProjects
    .filter(p => accountNames.has(p.account_name))
    .map(p => {
      return {
        ...p,
        listed: p.listed || req.query.markListed == p.id
      };
    });

  res.locals.defaultProjects = filteredProjects;
  next();
};

function updateUnits(req, res, next) {
  const { pius_listed, verified_listed, id, project_name } = req.body;

  let updatedProject, current;

  if (project_name) {
    current = projects.find(p => p.name === project_name) || {};
    updatedProject = {...current}
  } else {
    current = projects.find(p => p.id == id) || {};
    updatedProject = {...current}
  }

  if (current.piu_units && current.piu_units !== "0") {
    const inc = parseNumber(pius_listed);
    updatedProject.pius_listed = formatNumberWithCommas(inc);
  }

  if (current.verified_units && current.verified_units !== "0") {
    const inc = parseNumber(verified_listed);
    updatedProject.verified_listed = formatNumberWithCommas(inc);
  }

  res.locals.project = updatedProject;

  // Clean up session data
  if (req.body) {
    const keys = Object.keys(req.body);
    for (const key of keys) {
      delete req.session.data[key];
    }
  }
  next();
}

module.exports = {
  applyProjectFilters,
  resetProjectFields,
  getProject,
  updateProjectResponses,
  projectResponseValidate,
  getFormGroupStatus,
  getProjectSiteDetails,
  filterDeveloperProjects,
  updateUnits
}