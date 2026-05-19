const {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  listUsers,
  validateUserPassword
} = require("../services/userService");
const { signToken } = require("../utils/jwt");
const { registerSchema, loginSchema } = require("../validators/authValidators");

const resolvers = {
  Query: {
    me: async (_, __, context) => {
      if (!context.user) {
        return null;
      }

      return findUserById(context.user.id);
    },
    users: async (_, __, context) => {
      if (!context.user || context.user.role !== "ADMIN") {
        throw new Error("Forbidden");
      }

      return listUsers();
    }
  },
  Mutation: {
    login: async (_, { email, password }) => {
      const payload = loginSchema.parse({ email, password });
      const user = await findUserByEmail(payload.email);
      const isValid = await validateUserPassword(user, password);
      if (!isValid) {
        throw new Error("Invalid credentials");
      }

      const token = signToken({ id: user.id, role: user.role, email: user.email });
      return { token, user };
    },
    register: async (_, { username, email, password, role }, context) => {
      const payload = registerSchema.parse({ username, email, password, role });
      const existingUser = await findUserByEmail(payload.email);
      if (existingUser) {
        throw new Error("Email already registered");
      }

      const existingUsername = await findUserByUsername(payload.username);
      if (existingUsername) {
        throw new Error("Username already taken");
      }

      const resolvedRole =
        role && context.user && context.user.role === "ADMIN" ? payload.role : undefined;

      const user = await createUser({
        username: payload.username,
        email: payload.email,
        password: payload.password,
        role: resolvedRole
      });
      const token = signToken({ id: user.id, role: user.role, email: user.email });
      return { token, user };
    }
  },
  User: {
    createdAt: (user) => new Date(user.createdAt).toISOString(),
    __resolveReference: async (reference) => {
      return findUserById(reference.id);
    }
  }
};

module.exports = resolvers;
