const { lookupCompany, generateObjectId, toTitleCase } = require('../helpers');
const accounts = require('../assets/data/accounts.json');
const projects = require('../assets/data/projects.json');

function loadAccount(req, res, next) {
  const id = req.params.id;
  const foundAccount = accounts.find(account => account.id === id);

  if (req.session.userType === "developer") {
    res.locals.account = accounts[0];
  } else if (!foundAccount) {
    res.locals.account = {};
  } else {
    res.locals.account = foundAccount;
  }

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

// Account-specific helpers

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

    res.locals.account = req.session.account;

    next();
  };
}

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

function getAccountsByDeveloper(_, res, next) {
  const accountNames = [...new Set(projects.filter(project => project.developer === "GreenRoots CIC")
    .map(p => p.account_name))]
  const accountsObj = accountNames
    .reduce((acc, name) => [...acc, (accounts.find(acc => acc.account_name == name))], []);

  res.locals.filteredAccounts = accountsObj;
  next();
}

module.exports = {
  saveAccount,
  updateAccount,
  loadAccount,
  getAccountsByDeveloper
}