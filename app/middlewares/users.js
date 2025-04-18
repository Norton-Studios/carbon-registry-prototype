function applyUserType(req, res, next) {
  const userType = req.session.userType;
  res.locals.userType = userType || 'guest';
  next();
}

function ensureAdmin(req, res, next) {
  if (req.session.userType !== 'admin') {
    return res.status(403).send('403 Forbidden: You do not have access to this resource.');
  }
  next();
}

module.exports = {
  applyUserType,
  ensureAdmin
}