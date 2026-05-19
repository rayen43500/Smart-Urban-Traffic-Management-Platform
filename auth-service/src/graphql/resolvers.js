const { createUser, findUserByEmail, findUserById, validateUserPassword } = require("../services/userService");
const { signToken } = require("../utils/jwt");

const resolvers = {
  Query: {
    me: async (_, __, context) => {
      if (!context.user) {
        return null;
      }

      return findUserById(context.user.id);
    }
  },
  Mutation: {
    login: async (_, { email, password }) => {
      const user = await findUserByEmail(email);
      const isValid = await validateUserPassword(user, password);
      if (!isValid) {
        throw new Error("Invalid credentials");
      }

      const token = signToken({ id: user.id, role: user.role, email: user.email });
      return { token, user };
    },
    register: async (_, { username, email, password, role }) => {
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        throw new Error("Email already registered");
      }

      const user = await createUser({ username, email, password, role });
      const token = signToken({ id: user.id, role: user.role, email: user.email });
      return { token, user };
    }
  },
  User: {
    __resolveReference: async (reference) => {
      return findUserById(reference.id);
    }
  }
};

module.exports = resolvers;
