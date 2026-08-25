const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { requireAdmin, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const valid = await admin.checkPassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name || admin.username,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// --- Everything below is for the admin to manage manager / happiness-manager accounts ---
router.use(requireAdmin, requireRole("admin"));

// POST /api/auth/staff — create a manager or happiness_manager login
router.post("/staff", async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: "Username, password, and role are required." });
    }
    if (!Admin.ROLES.includes(role)) {
      return res.status(400).json({ message: "Role must be admin, manager, or happiness_manager." });
    }

    const exists = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ message: "That username is already taken." });
    }

    const passwordHash = await Admin.hashPassword(password);
    const staff = await Admin.create({
      username: username.toLowerCase().trim(),
      passwordHash,
      name: name || username,
      role,
    });

    res.status(201).json({
      id: staff._id,
      username: staff.username,
      name: staff.name,
      role: staff.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// GET /api/auth/staff?role=manager — list staff accounts, optionally filtered by role
router.get("/staff", async (req, res) => {
  try {
    const filter = {};
    if (req.query.role && Admin.ROLES.includes(req.query.role)) {
      filter.role = req.query.role;
    }
    const staff = await Admin.find(filter).select("username name role createdAt").sort({ name: 1 });
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;
