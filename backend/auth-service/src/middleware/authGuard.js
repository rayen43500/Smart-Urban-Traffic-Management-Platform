const { getUserFromHeader } = require("../utils/jwt");

function authGuard(req, res, next) {
  const user = getUserFromHeader(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.user = user;
  return next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}

module.exports = { authGuard, requireRole };
