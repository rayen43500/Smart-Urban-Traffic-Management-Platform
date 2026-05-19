const jwt = require("jsonwebtoken");

function getUserFromHeader(authHeader, secret) {
  if (!authHeader || !secret) {
    return null;
  }

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

module.exports = { getUserFromHeader };
