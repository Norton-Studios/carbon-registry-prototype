const { lookupCompany, generateObjectId, toTitleCase } = require('../helpers');
const accounts = require('../assets/data/accounts.json');

function formatAccountFromResponses(responses = [], manager) {
  const getValue = label =>
    responses.find(item => item.label === label)?.value || '';

  const addressSnippet = getValue('Address');
  const addressParts = addressSnippet.split(',').map(part => part.trim());
  const country = addressParts[addressParts.length - 2] || ''; // second last part
  const name = getValue('Organisation Name');

  return {
    id: generateObjectId(),
    status: 'unverified',
    crn: getValue('Company Registration Number'),
    account_name: toTitleCase(name),
    address: addressSnippet,
    country,
    classification: getValue('Classification'),
    standard: getValue('Standard'),
    manager: manager,
    date: getTodayFormatted()
  };
}

function getTodayFormatted(date = new Date()) {
  return new Date().toISOString().split('T')[0];
}

function loadAccount(req, res, next) {
  const account = res.locals.account || req.session.account;

  if (!account || !account.id) {
    return res.status(400).send('No account ID available');
  }

  res.locals.account = account;
  next();
}

function saveAccount(req, res, next) {
  const getManagerNameFromResponse = (accountResponses) => {
    const firstName = accountResponses.find(r => r.label === 'First Name')?.value;
    const lastName = accountResponses.find(r => r.label === 'Last Name')?.value;
    return `${firstName} ${lastName}`.trim();
  };

  const { responses, accountResponses } = req.session.data.registration;
  const manager = getManagerNameFromResponse(accountResponses);
  const account = formatAccountFromResponses(responses, manager);

  req.session.account = account;
  res.locals.account = account;

  if (!Array.isArray(req.session.accounts) || req.session.accounts.length === 0) {
    req.session.accounts = [...accounts];
  }

  req.session.accounts.push(account);

  next();
}

function loadAllAccounts(req, res, next) {
  res.locals.accounts = req.session.accounts || accounts;
  next();
}

async function validateAccount(account, apiKey) {
  let organisation = {}; 
  let users = {}; 
  let payment = {}; 
  let company = await lookupCompany(account.crn, apiKey);

  const validations = [
    {
      condition: !company,
      key: 'companyNotFound',
      message: 'Not found on Companies House.'
    },
    {
      condition: company && !company.company_status,
      key: 'invalidStatus',
      message: () => `${company.title} is ${company.company_status}`
    },
    {
      condition: company && account.account_name !== company.title,
      key: 'nameMismatch',
      message: () =>
        `${account.account_name} does not match the Companies House registered name: ${company.title}`
    }
  ];

  validations.forEach(rule => {
    if (rule.condition) {
      organisation[rule.key] =
        typeof rule.message === 'function' ? rule.message() : rule.message;
    }
  });

  return {organisation, users, payment};
}

function updateAccount(updates = {}) {
  return (req, res, next) => {
    const currentAccount = req.session.account;

    if (!currentAccount || !currentAccount.id) {
      return res.status(400).send('No account to update.');
    }

    if (!Array.isArray(req.session.accounts)) {
      req.session.accounts = [];
    }

    updates.dateModified = getTodayFormatted();
    Object.assign(req.session.account, updates);

    req.session.accounts = req.session.accounts.map(account =>
      account.id === currentAccount.id ? { ...account, ...updates } : account
    );

    console.log('Updated session.accounts:', JSON.stringify(req.session.accounts));  // Log after update
    res.locals.account = req.session.account;

    next();
  };
}


module.exports = {
  saveAccount,
  updateAccount,
  loadAccount,
  loadAllAccounts,
  validateAccount
}