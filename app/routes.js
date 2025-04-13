//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit');
const router = govukPrototypeKit.requests.setupRouter();
const projects = require('./assets/data/projects.json');
const { generateFilters, filterProjects } = require('./helpers.js');

function getProjectMiddleware(req, res, next) {
  const projectName = req.params.name;
  const project = projects.find(
    p => p.name.toLowerCase().replace(/\s+/g, '-') === projectName.toLowerCase()
  );

  if (!project) {
    return res.status(404).redirect('/error-page-not-found');
  }

  res.locals.project = project;
  next();
}

function applyProjectFilters(req, res, next) {
  const { data } = req.session;
  res.locals.filteredProjects = filterProjects(projects, data);
  res.locals.projectFilters = generateFilters(projects);
  next();
}

router.get('/dashboard', (_, res) => {
  res.render('dashboard', {
    projects,
    authenticated: true
  });
});

router.get('/dashboard/:name', getProjectMiddleware, (_, res) => {
  res.render('project-details', {
    project: res.locals.project,
    authenticated: true
  });
});

router.get('/registry', applyProjectFilters, (_, res) => {
  res.render('registry', {
    projects: res.locals.filteredProjects,
    filters: res.locals.projectFilters
  });
});

router.get('/projects/:name', getProjectMiddleware, (_, res) => {
  res.render('project-details', {
    project: res.locals.project,
  });
});

router.get('/', (_, res) => {
  res.redirect('/registry');
});

module.exports = router;
// Add your routes here
