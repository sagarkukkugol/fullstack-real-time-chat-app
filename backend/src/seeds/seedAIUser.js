/**
 * seedAIUser.js
 *
 * Run ONCE to create the Chatty AI virtual user in your database.
 *
 * Usage:
 *   node src/seeds/seedAIUser.js
 *
 * The _id is deterministic (hardcoded) so every developer shares the same AI user ID.
 * Store it in your .env as AI_USER_ID after running this script.
 *
 * What gets created:
 *   - fullName : "Chatty AI"
 *   - email    : "chatty-ai@internal.app"  (not a real email, never used for login)
 *   - password : a bcrypt hash of a random string (cannot be logged into)
 *   - profilePic: a robot emoji avatar URL (or leave blank)
 *   - isAI     : true  ← flag on the User model so backend can detect it
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/user.model.js";
import { connectDB } from "../lib/db.js";

dotenv.config();

const AI_USER_ID = "000000000000000000000001"; // fixed ObjectId — store this in .env

const seedAIUser = async () => {
  try {
    await connectDB();

    const existing = await User.findById(AI_USER_ID);
    if (existing) {
      console.log("✅ Chatty AI user already exists:", existing._id.toString());
      process.exit(0);
    }

    // Hash a random password — no one will ever log in as this user
    const fakePassword = await bcrypt.hash("AI_INTERNAL_" + Math.random(), 10);

    const aiUser = new User({
      _id: new mongoose.Types.ObjectId(AI_USER_ID),
      fullName: "Chatty AI",
      email: "chatty-ai@internal.app",
      password: fakePassword,
      profilePic: "", // leave blank or set a URL to an AI avatar image
      isAI: true,
    });

    await aiUser.save();
    console.log("🤖 Chatty AI user created:", aiUser._id.toString());
    console.log("👉 Add this to your .env:  AI_USER_ID=" + AI_USER_ID);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seedAIUser();
