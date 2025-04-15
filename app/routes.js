//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit');
const router = govukPrototypeKit.requests.setupRouter();
const projects = require('./assets/data/projects.json');
const accounts = require('./assets/data/accounts.json');
const { generateFilters, filterProjects, getProject } = require('./helpers.js');

function getProjectMiddleware(req, res, next) {
  const projectName = req.params.name;
  const project = getProject(projects, projectName);
  if (!project) {
    return res.status(404).redirect('/error-page-not-found');
  }

  res.locals.project = project;
  next();
}

function applyProjectFilters(req, res, next) {
  res.locals.filteredProjects = filterProjects(projects, req.session.data);
  res.locals.projectFilters = generateFilters(projects);
  next();
}

function applyUserType(req, res, next) {
  const userType = req.session.userType;
  res.locals.userType = userType || 'guest';
  next();
}

router.use(applyUserType);

router.get('/projects/:name', getProjectMiddleware, (req, res) => {
  const isAdmin = req.session.userType === 'admin';

  res.render('project-details', {
    project: res.locals.project,
    ...(isAdmin && { authenticated: true })
  });
});

router.post('/registry', (req, res) => {
  if (req.body.clearFilters) {
    (req.session.data.filterKeys || []).forEach(key => delete req.session.data[key]);
  }
  res.redirect('/#projects');
});

router.get('/', (req, res) => {
  switch (req.session.userType) {
    case 'admin':
      res.render('dashboard', {
        projects,
        authenticated: true
      });
      break;

    default:
      applyProjectFilters(req, res, () => {
        res.render('registry', {
          accounts,
          projects: res.locals.filteredProjects,
          filters: res.locals.projectFilters
        });
      });
      break;
  }
});

router.get('/login', (_, res) => {
  res.render('login', { });
});

router.post('/login', (req, res) => {
  const { username } = req.body;
  if (username.startsWith('admin')) {
    req.session.userType = 'admin';
    res.redirect('/');
  } else if (username.startsWith('trader')) {
    req.session.userType = 'trader';
    res.redirect('/');
  } else if (username.startsWith('developer')) {
    req.session.userType = 'developer';
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid username' });
  }
});

router.get('/logout', (req, res) => {
  req.session.userType = "guest ";
  res.redirect('/');
});

module.exports = router;
// Add your routes here
