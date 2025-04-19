//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const dotenv = require('dotenv');
const govukPrototypeKit = require('govuk-prototype-kit');
const router = govukPrototypeKit.requests.setupRouter();
const projects = require('./assets/data/projects.json');
const accounts = require('./assets/data/accounts.json');
const multer = require('multer');
const upload = multer({ dest: 'app/assets/uploads/' });
const { lookupCompany, updateRegistrationResponses } = require('./helpers.js');
const { 
  validateAccount,
  saveAccount,
  updateAccount,
  loadAccount,
  loadAllAccounts
} = require('./middlewares/accounts.js');
const {
  applyProjectFilters,
  resetProjectFields,
  getMyProjects,
  getProject,
  updateProjectResponses,
  projectResponseValidate,
  getFormGroupStatus,
  getProjectSiteDetails,
} = require('./middlewares/projects.js');
const { applyUserType, ensureAdmin } = require ('./middlewares/users.js')

dotenv.config();

router.use(applyUserType);

router.post('/upload', upload.single('fileUpload'), getProjectSiteDetails, getFormGroupStatus, async (_, res) => {
  res.redirect('/create-project/answer-summary');
});

router.post('/create-project/form', updateProjectResponses, getFormGroupStatus, projectResponseValidate, (_, res) => {
  res.render('create-project/form')
});

router.get('/create-project/form', (req, res) => {
  const { changeFormLabel } = req.session.data;
  if (changeFormLabel) {
    delete req.session.data.changeFormLabel;
    return res.render('create-project/form', { key: changeFormLabel });
  }
  res.render('create-project/form');
});

router.post('/create-project', resetProjectFields, (_, res) => {
  res.render('create-project');
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
  res.render('dashboard', {
    projects: res.locals.projects,
    authenticated: true
  });
});

router.get('/projects/:name', getProject, (req, res) => {
  const isAdmin = req.session.userType === 'admin';
  const isDev = req.session.userType === 'developer';

  res.render('project-details', {
    project: res.locals.project,
    osApiKey: process.env.OS_API_KEY,
    ...(isAdmin || isDev ? { authenticated: true } : {})
  });
});

// Registration routes

router.get('/register', (req, res) => {
  res.render('register/start')
})

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

router.get('/register/confirm-details', (req, res) => {
  res.render('register/confirm-details', {
    account: res.locals.account
  });
});

router.post('/register/confirm-details', saveAccount, (req, res) => {
  req.session.userType = req.session.data.registration.responses.some(f => f.label === "Classification" && f.value === 'Project Developer') ? 'developer' : 'trader'; // might need to do something better eventually
  req.session.authenticated = true;
  res.redirect('/register/success');
});

router.get('/register/success', loadAccount, (req, res) => {
  res.render('register/success', {
    account: res.locals.account
  });
});

router.get('/', (req, res) => {
  switch (req.session.userType) {
    case 'admin':
      loadAllAccounts(req, res, () => {
        const pendingProjects = projects
          .filter(project => project.pendingApproval)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        const pendingAccounts = res.locals.accounts
          .filter(account => account.status.pendingApproval)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        res.render('admin/dashboard', {
          pendingProjects,
          pendingAccounts
        });
      });
      break;

    case 'developer':
      getMyProjects(req, res, () => {
        delete req.session.data['paymentSuccess'];
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

// Admin routes

router.use('/admin', ensureAdmin);

router.get('/admin/accounts', (req, res) => {
  res.render('admin/accounts', {
    accounts: res.locals.accounts || accounts
  })
});

router.get('/admin/projects', applyProjectFilters, (req, res) => {
  res.render('admin/projects', {
    projects,
    osApiKey: process.env.OS_API_KEY,
    filters: res.locals.projectFilters
  })
});

router.get('/admin/projects/review/:name', getProject, (req, res) => {
  res.render('admin/review-project', {
    project: res.locals.project,
    osApiKey: process.env.OS_API_KEY
  })
});

router.get('/admin/accounts/review/:id', loadAccount, async (req, res) => {
  validationErrors = await validateAccount(res.locals.account, process.env.COMPANY_INFO_API_KEY)
  res.render('admin/review-account', {
    project: res.locals.account,
    osApiKey: process.env.OS_API_KEY,
    validationErrors: validationErrors
  })
});

// Authentication routes

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
  req.session.userType = "guest";
  res.redirect('/');
});

// Account routes

router.get('/account', loadAccount, (req, res) => {
  console.log(res.locals.account);
  res.render('/account/dashboard', {
    account: res.locals.account
  });
});

router.get('/account/:id', loadAccount, (req, res) => {
  res.render('/account/dashboard', {
    account: res.locals.account
  });
});

router.get('/account/verification', (req, res) => {
  res.render('account/verification', {
    account: res.locals.account
  });
});

router.get('/account/account-verified', updateAccount({ pendingApproval: true }), (req, res) => {
  res.render('account/verification', {
    account: res.locals.account
  })
})

router.post('/account/company-registration', (req, res) => {
  res.redirect('/account/verification');
});

router.post('/account/payment', (req, res) => {
  res.redirect('/account/account-verified');
});

module.exports = router;
