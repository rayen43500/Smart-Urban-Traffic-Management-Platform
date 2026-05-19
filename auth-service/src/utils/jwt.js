const jwt = require("jsonwebtoken");
const config = require("../config");

function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

function getUserFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

module.exports = { signToken, verifyToken, getUserFromHeader };
