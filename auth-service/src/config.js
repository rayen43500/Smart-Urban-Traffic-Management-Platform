require("dotenv").config();

const config = {
  port: Number(process.env.PORT || 4001),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d"
};

if (!config.databaseUrl) {
  console.warn("DATABASE_URL is not set");
}

if (!config.jwtSecret) {
  console.warn("JWT_SECRET is not set");
}

module.exports = config;
