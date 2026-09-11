const mongoose = require("mongoose");

// One entry per admin-triggered change, across every entity type in the
// app. Kept as a flat, append-only collection (rather than nesting history
// inside each entity) so the Super Admin log tab can show one combined,
// chronological feed instead of having to fan out across collections.
const ACTIONS = [
  "complaint.assigned",
  "complaint.submitted",
  "complaint.status_changed",
  "warranty.created",
  "warranty.updated",
  "warranty.deleted",
  "lost_invoice.approved",
  "lost_invoice.rejected",
  "staff.created",
];

const ENTITY_TYPES = ["complaint", "warranty", "lost_invoice", "staff"];

const activityLogSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ACTIONS, required: true, index: true },
    // Ready-to-display sentence — built once at write time so the log tab
    // never has to reconstruct wording from raw field diffs.
    summary: { type: String, required: true, trim: true },

    // Snapshot the acting admin's identity at write time (rather than only
    // storing a ref) so the log stays readable even if that account is
    // ever renamed or removed later.
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      username: { type: String, trim: true },
      role: { type: String, trim: true },
    },

    entityType: { type: String, enum: ENTITY_TYPES, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    // Human-facing token (KP-2026-0004, a warranty token, a staff username)
    // so the log is searchable without joining back to the source record.
    entityToken: { type: String, trim: true },

    // Small structured extras for a given action (e.g. { from, to } for a
    // status change) — optional, not rendered on its own, just kept for
    // anyone who needs the raw detail later.
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

activityLogSchema.statics.ACTIONS = ACTIONS;
activityLogSchema.statics.ENTITY_TYPES = ENTITY_TYPES;

module.exports = mongoose.model("ActivityLog", activityLogSchema);