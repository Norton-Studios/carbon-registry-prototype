const accounts = require('../assets/data/accounts.json');

function getAccount(req, res, next) {
    const account = res.locals.accounts || accounts
      .find(account => account.id === req.params.id);
    if (!account) {
      return res.status(404).redirect('/error-page-not-found');
    };
    res.locals.account = account;
  next();
};

module.exports = {
  getAccount,
}