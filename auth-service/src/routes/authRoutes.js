const express = require("express");
const { registerSchema, loginSchema } = require("../validators/authValidators");
const { createUser, findUserByEmail, validateUserPassword } = require("../services/userService");
const { signToken } = require("../utils/jwt");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const existingUser = await findUserByEmail(payload.email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await createUser(payload);
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

module.exports = router;
