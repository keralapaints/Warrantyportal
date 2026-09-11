const ActivityLog = require("../models/ActivityLog");

// Writes one activity-log entry. `actor` is expected to be req.admin (the
// decoded JWT payload: { id, username, role }).
//
// Deliberately fire-and-forget-safe: a logging failure should never break
// the request that triggered it, so errors are swallowed after being
// logged to the server console.
async function logActivity({ actor, action, summary, entityType, entityId, entityToken, meta }) {
  try {
    await ActivityLog.create({
      action,
      summary,
      actor: actor ? { id: actor.id, username: actor.username, role: actor.role } : undefined,
      entityType,
      entityId,
      entityToken,
      meta,
    });
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
}

module.exports = { logActivity };