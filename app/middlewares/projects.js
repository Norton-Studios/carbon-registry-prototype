const path = require('path');
const projects = require('../assets/data/projects.json');
const {
  generateFilters,
  filterProjects,
  getProjectByName,
  extractPdfText,
  extractGridRefs,
  getProjectViewModel
} = require('../helpers');
const { getLocationFromGridRef } = require('../../add-project-locations.js');

//projects
function applyProjectFilters(req, res, next) {
  res.locals.filteredProjects = filterProjects(projects, req.session.data);
  res.locals.projectFilters = generateFilters(projects);
  next();
}

function getMyProjects(req, res, next) {
  if (req.session.userType !== 'developer') {
    return res.redirect('/');
  }

  res.locals.projects = filterProjects(projects, {
    filterKeys: req.session.data.filterKeys,
  });
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
    responses: updatedResponses
  };

  next();
}

async function getProjectSiteDetails(req, res, next) {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }
  const filePath = file.path;
  const ext = path.extname(file.originalname).toLowerCase();

  try {
    if (ext === '.pdf') {
      const rawText = await extractPdfText(filePath);
      const nhCode = extractGridRefs(rawText)[0];
      const siteDetails = await getLocationFromGridRef(nhCode);

      if (!siteDetails) {
        return res.status(400).send('Unable to get location details.');
      }

      const existingProject = req.session.data.project || {};

      req.session.data.project = {
        ...existingProject,
        responses: {
          ...existingProject.responses,
          ...siteDetails
        }
      };
    } else {
      return res.status(400).send('Unsupported file type. Only PDF and CSV allowed.');
    }
    next();
  } catch (err) {
    res.status(500).send('Error processing file.');
  }
}

module.exports = {
  applyProjectFilters,
  resetProjectFields,
  getMyProjects,
  getProject,
  updateProjectResponses,
  getProjectSiteDetails
}