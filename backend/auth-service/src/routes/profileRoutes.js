const express = require("express");
const { authGuard } = require("../middleware/authGuard");
const { findUserById } = require("../services/userService");

const router = express.Router();

router.get("/profile", authGuard, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
