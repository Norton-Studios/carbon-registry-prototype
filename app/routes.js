//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const dotenv = require('dotenv');
const govukPrototypeKit = require('govuk-prototype-kit');
const router = govukPrototypeKit.requests.setupRouter();
const users = require('./assets/data/users.json');
const projects = require('./assets/data/projects.json');
const accounts = require('./assets/data/accounts.json');
const multer = require('multer');
const upload = multer({ dest: 'app/assets/uploads/' });
const { lookupCompany, updateRegistrationResponses, toTitleCase } = require('./helpers.js');
const {
  saveAccount,
  updateAccount,
  loadAccount,
  getAccountsByDeveloper
} = require('./middlewares/accounts.js');
const {
  applyProjectFilters,
  resetProjectFields,
  getProject,
  updateProjectResponses,
  projectResponseValidate,
  getFormGroupStatus,
  getProjectSiteDetails,
  filterDeveloperProjects,
  updateUnits
} = require('./middlewares/projects.js');
const { applyUserType, ensureAdmin } = require ('./middlewares/users.js')

dotenv.config();

router.use(applyUserType);


router.get('/developer/manage-units/update-listing/:name', getProject, (_, res) => {
  res.render('developer/manage-units/update-listing', {
    project: res.locals.project
  })
});

router.post('/developer/manage-units/update-listing', updateUnits, (req, res) => {
  req.session.data.updatedProject = res.locals.project;
  res.redirect(`/developer/manage-units`)
});

router.get('/developer/manage-units', getAccountsByDeveloper, filterDeveloperProjects, (_, res) => {
  res.render('/developer/manage-units', {
    myAccounts: res.locals.filteredAccounts,
    myProjects: res.locals.filteredProjects,
    projects: res.locals.projects
  })
})

router.post('/developer/upload', upload.single('fileUpload'), getProjectSiteDetails, getFormGroupStatus, async (_, res) => {
  res.redirect('/developer/create-project/answer-summary');
});

router.get('/developer/create-project/document-upload', (req, res) => {
  const {formError, bannerState} = req.session.data || {};
  if (formError) delete req.session.data.formError;
  if (bannerState) delete req.session.data.bannerState;

  if (bannerState) {
    res.render('/developer/create-project', { bannerState })
  } else {
    res.render('/developer/create-project/document-upload', { formError: formError ?? null })
  }
});

router.post('/developer/create-project/form', updateProjectResponses, getFormGroupStatus, projectResponseValidate, (_, res) => {
  res.render('developer/create-project/form')
});

router.get('/developer/create-project/form', (req, res) => {
  const { changeFormLabel } = req.session.data;
  if (changeFormLabel) {
    delete req.session.data.changeFormLabel;
    return res.render('developer/create-project/form', { key: changeFormLabel });
  }
  res.render('developer/create-project/form');
});

router.post('/developer/create-project', resetProjectFields, getFormGroupStatus, (_, res) => {
  res.render('developer/create-project');
});

router.get('/developer/my-projects/:name/verification', (_, res) => {
  res.render('payment');
});

router.get('/developer/my-projects', (req, res) => {
  res.render('developer/my-projects', {
    projects,
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

router.post('/registry', (req, res) => {
  if (req.body.submitAction === 'reset') {
    (req.session.data.filterKeys || []).forEach(key => delete req.session.data[key]);
  }
  res.redirect('/#projects');
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
      const pendingProjects = projects
        .filter(project => project.pendingApproval)
        .sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));
      const pendingAccounts = accounts
        .filter(account => account.pendingApproval)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      res.render('admin/dashboard', {
        pendingProjects,
        pendingAccounts
      });
      break;

    case 'developer':
      getAccountsByDeveloper(req, res, () => {
        filterDeveloperProjects(req, res, () => {
          res.render('developer/dashboard', {
            projects,
            myProjects: res.locals.filteredProjects,
            myAccounts: res.locals.filteredAccounts
          });
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
    organisations: res.locals.accounts || accounts,
    users
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
  const isAdmin = req.session.userType === 'admin';
  res.render('admin/review-project', {
    project: res.locals.project,
    osApiKey: process.env.OS_API_KEY,
    ...(isAdmin ? { authenticated: true } : {})
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

router.get('/notifications/:id', (req, res) => {
  res.render('admin/notification-edit', {});
});

module.exports = router;
