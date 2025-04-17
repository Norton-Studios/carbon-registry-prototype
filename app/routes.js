//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const dotenv = require('dotenv');
const govukPrototypeKit = require('govuk-prototype-kit');
const router = govukPrototypeKit.requests.setupRouter();
const projects = require('./assets/data/projects.json');
const accounts = require('./assets/data/accounts.json');
const { generateFilters, filterProjects, getProject, lookupCompany, updateRegistrationResponses } = require('./helpers.js');

dotenv.config();

function getProjectMiddleware(req, res, next) {
  const projectName = req.params.name;
  const project = getProject(projects, projectName);
  if (!project) {
    return res.status(404).redirect('/error-page-not-found');
  }

  res.locals.project = getProjectViewModel(project);
  next();
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

function getMyProjects(req, res, next) {
  if (req.session.userType !== 'developer') {
    return res.redirect('/');
  }

  res.locals.projects = filterProjects(projects, {
    filterKeys: req.session.data.filterKeys,
  });
  next();
}

function applyProjectFilters(req, res, next) {
  res.locals.filteredProjects = filterProjects(projects, req.session.data);
  res.locals.projectFilters = generateFilters(projects);
  next();
}

async function resetProjectFields(req, _, next) {
  if (req.body.reset) {
    const fields = req.session.data.projectFields || [];
    for (const key of fields) {
      if (req.session.data[key]) {
        delete req.session.data[key];
      }
    }

    req.session.data.fieldId = '1';
  }

  next();
}

function applyUserType(req, res, next) {
  const userType = req.session.userType;
  res.locals.userType = userType || 'guest';
  next();
}

router.use(applyUserType);

router.post('/create-project', resetProjectFields, (_, res) => {
  res.render('create-project');
});

router.get('/projects/:name', getProjectMiddleware, (req, res) => {
  const isAdmin = req.session.userType === 'admin';
  const isDev = req.session.userType === 'developer';

  res.render('project-details', {
    project: res.locals.project,
    osApiKey: process.env.OS_API_KEY,
    ...(isAdmin || isDev ? { authenticated: true } : {})
  });
});

router.get('/register/company-number', (req, res) => {
  const formError = req.session.data.formError;
  delete req.session.data.formError;

  res.render('register/company-number', {
    formError,
  });
});

router.get('/register/company-details-confirmation', (req, res) => {
  const formError = req.session.formError;
  delete req.session.formError;

  res.render('register/company-details-confirmation', {
    formError,
    responses: req.session.data.registration.responses,
  });
});

router.post('/register/company-details-confirmation', (req, res) => {
  // Proceed to the next step after confirmation
  res.redirect('/register/classification');
});

router.post('/register/company-number', async (req, res) => {
  const { companyNumber } = req.body;

  try {
    const company = await lookupCompany(companyNumber, process.env.COMPANY_INFO_API_KEY);

    if (!company) {
      req.session.data.formError = {
        message: `No company found with registration ${companyNumber}. Please check the number and try again.`,
      };
      return res.redirect('/register/company-number');
    }

    if (company.company_status !== 'active') {
      req.session.data.formError = {
        message: `${company.title} is ${company.company_status}. Only active companies can register.`,
      };
      return res.redirect('/register/company-number');
    }

    updateRegistrationResponses(req, [
      {
        label: 'Company Registration Number',
        value: companyNumber,
        changeUrl: '/register/company-number'
      },
      {
        label: 'Organisation Name',
        value: company.title,
        changeUrl: '/register/registered-name'
      },
      {
        label: 'Address',
        value: company.address_snippet,
        changeUrl: '/register/address'
      }
    ]);

    res.redirect('/register/company-details-confirmation');
  } catch (err) {
    req.session.formError = {
      message: 'There was a problem connecting to Companies House. Please try again later.',
    };
    res.redirect('/register/classification');
  }
});

router.post('/register/classification', (req, res) => {
  if (req.body.classification) {
    updateRegistrationResponses(req, {
      label: 'Classification',
      value: req.body['buyer-classification'] || req.body.classification,
      changeUrl: '/register/classification'
    });
    res.redirect('/register/standard');
  }
})

router.post('/register/standard', async (req, res) => {
  const { standard } = req.body;

  updateRegistrationResponses(req, {
      label: 'Standard',
      value: standard,
      changeUrl: '/register/standard'
    })

    res.redirect('/register/privacy');
});

router.post('/register/privacy', async (req, res) => {
    // save this post request later
    res.redirect('/register/main-contact');
});

router.post('/register/main-contact', (req, res) => {
  const {firstName, lastName, email, phone} = req.body;
  if (firstName && lastName && email && phone) {
    updateRegistrationResponses(req, [
      { label: 'First Name', value: firstName, changeUrl: '/register/main-contact' },
      { label: 'Last Name', value: lastName, changeUrl: '/register/main-contact' },
      { label: 'Email', value: email, changeUrl: '/register/main-contact' },
      { label: 'Phone Number', value: phone, changeUrl: '/register/main-contact' }
    ])
    res.redirect('/register/declaration');
  }
});

router.post('/register/declaration', (req, res) => {
  // Use registration responses to create new user in req.session.data.users
  res.redirect('/register/confirm-details')
});

router.post('/registry', (req, res) => {
  if (req.body.submitAction === 'reset') {
    (req.session.data.filterKeys || []).forEach(key => delete req.session.data[key]);
  }
  res.redirect('/#projects');
});

router.get('/my-projects/:name/verification', (_, res) => {
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
      const pendingAccounts = accounts
        .filter(account => account.pending)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      res.render('admin/dashboard', {
        projects,
        pendingAccounts,
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
          osApiKey: process.env.OS_API_KEY,
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

router.get('/account', (req, res) => {
  res.redirect('/account/verification'); // maybe something else later
});

router.get('/account/verification', (req, res) => {
  res.render('account/verification', {
    userType: req.session.userType
  });
});



module.exports = router;
// Add your routes here
