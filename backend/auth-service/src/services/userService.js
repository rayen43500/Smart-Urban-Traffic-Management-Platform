const prisma = require("../db");
const { hashPassword, comparePassword } = require("../utils/password");

async function createUser({ username, email, password, role }) {
  const hashedPassword = await hashPassword(password);
  return prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role: role || "OPERATOR"
    }
  });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function findUserByUsername(username) {
  return prisma.user.findUnique({ where: { username } });
}

async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });
}

async function validateUserPassword(user, password) {
  if (!user) {
    return false;
  }

  return comparePassword(password, user.password);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  listUsers,
  validateUserPassword
};
