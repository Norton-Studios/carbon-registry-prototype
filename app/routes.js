//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const dotenv = require('dotenv');
const govukPrototypeKit = require('govuk-prototype-kit');
const router = govukPrototypeKit.requests.setupRouter();
const projects = require('./assets/data/projects.json');
const accounts = require('./assets/data/accounts.json');
const { generateFilters, filterProjects, getProject } = require('./helpers.js');

dotenv.config();

function getProjectMiddleware(req, res, next) {
  const projectName = req.params.name;
  const project = getProject(projects, projectName);
  if (!project) {
    return res.status(404).redirect('/error-page-not-found');
  }

  res.locals.project = project;
  next();
}

function getMyProjects(req, res, next) {
  if (req.session.userType !== 'developer') {
    return res.redirect('/');
  }

  res.locals.projects = filterProjects(projects, {
    filterKeys: req.session.data.filterKeys,
    account_name: ['GreenRoots CIC']
  });
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
  const isDev = req.session.userType === 'developer';

  res.render('project-details', {
    project: res.locals.project,
    ...(isAdmin || isDev ? { authenticated: true } : {})
  });
});

router.post('/register/organisation-details/company-number', async (req, res) => {
  const url = `https://api.company-information.service.gov.uk/search/companies?q=${req.body.companyNumber}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${process.env.COMPANY_INFO_API_KEY}:`).toString('base64'),
      },
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }
    const company = await response.json()
    req.session.data = {...req.session.data, ...company.items[0]};
    req.session.data.organisationDetails = "In progress";
    res.redirect('/register/organisation-details/confirm-company');
  } catch (err) {
    console.error('API call failed:', err);
    throw err;
  }
});

router.post('/register/organisation-details/classification', (req, res) => {
  if (req.body.classification) {
    req.session.data = {...req.session.data, ...req.body.classification};
    res.redirect('/register/organisation-details/main-contact');
  }
})

router.post('/register/organisation-details/main-contact', (req, res) => {
  const {firstName, lastName, email, phone} = req.body;
  if (firstName && lastName && email && phone) {
    req.session.data.contact = req.body;
    res.redirect('/register/organisation-details/summary');
  }
  // else {rerender page highlighting missing fields?}
})

router.post('/register/organisation-details/summary', (req, res) => {
  req.session.data.organisationDetails = "Complete";
  res.redirect('/register');
})

router.post('/registry', (req, res) => {
  if (req.body.submitAction === 'reset') {
    (req.session.data.filterKeys || []).forEach(key => delete req.session.data[key]);
  }
  res.redirect('/#projects');
});

router.get('/create-project/:name/verification', (_, res) => {
  res.render('payment');
})

router.get('/my-projects', getMyProjects, (req, res) => {
  delete req.session.data['paymentSuccess'];
  res.render('dashboard', {
    projects: res.locals.projects,
    authenticated: true
  });
});

router.get('/', (req, res) => {
  switch (req.session.userType) {
    case 'admin':
      res.render('dashboard', {
        projects,
        authenticated: true
      });
      break;

    case 'developer':
      getMyProjects(req, res, () => {
        res.render('milestones', {
          projects: res.locals.projects
        });
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
