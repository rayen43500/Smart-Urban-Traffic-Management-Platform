const express = require("express");
const { registerSchema, loginSchema } = require("../validators/authValidators");
const {
  createUser,
  findUserByEmail,
  findUserByUsername,
  listUsers,
  validateUserPassword
} = require("../services/userService");
const { getUserFromHeader, signToken } = require("../utils/jwt");
const { authGuard, requireRole } = require("../middleware/authGuard");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const existingUser = await findUserByEmail(payload.email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const existingUsername = await findUserByUsername(payload.username);
    if (existingUsername) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const requester = getUserFromHeader(req.headers.authorization);
    const role = requester && requester.role === "ADMIN" ? payload.role : undefined;

    const user = await createUser({ ...payload, role });
    const token = signToken({ id: user.id, role: user.role, email: user.email });

    return res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await findUserByEmail(payload.email);
    const isValid = await validateUserPassword(user, payload.password);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email });

    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/users", authGuard, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const users = await listUsers();
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
