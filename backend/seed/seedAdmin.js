require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Admin = require("../models/Admin");

async function run() {
  const username = (process.env.SEED_ADMIN_USERNAME || "admin").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.error("Set SEED_ADMIN_PASSWORD in .env before running this script.");
    process.exit(1);
  }

  await connectDB();

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists. Skipping.`);
  } else {
    const passwordHash = await Admin.hashPassword(password);
    await Admin.create({ username, passwordHash, name: "Admin" });
    console.log(`Admin "${username}" created.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
