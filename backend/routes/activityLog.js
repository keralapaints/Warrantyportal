const express = require("express");
const ActivityLog = require("../models/ActivityLog");
const { requireAdmin, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin (Super Admin) only — this is a cross-entity audit trail, not
// something managers or happiness managers need to see.
router.use(requireAdmin, requireRole("admin"));

// GET /api/activity-log?page=1&limit=30&entityType=&action=
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    const filter = {};
    if (req.query.entityType && ActivityLog.ENTITY_TYPES.includes(req.query.entityType)) {
      filter.entityType = req.query.entityType;
    }
    if (req.query.action && ActivityLog.ACTIONS.includes(req.query.action)) {
      filter.action = req.query.action;
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;