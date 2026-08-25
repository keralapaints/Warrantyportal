const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["admin", "manager", "happiness_manager"];

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: "admin" },
  },
  { timestamps: true }
);

adminSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10);
};

adminSchema.statics.ROLES = ROLES;

module.exports = mongoose.model("Admin", adminSchema);
