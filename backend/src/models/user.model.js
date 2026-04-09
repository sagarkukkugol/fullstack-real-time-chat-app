import mongoose from "mongoose";

/**
 * User Schema
 *
 * CHANGED:
 *   - Added phoneNumber (required, unique, 10-digit validated)
 *   - Added isAI flag (kept from AI feature, defaults false)
 *
 * NEVER CHANGED by the profile-edit API:
 *   - email    (immutable after signup)
 *   - password (changed only via a dedicated change-password flow, not here)
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    profilePic: {
      type: String,
      default: "",
    },

    // ── NEW: Phone number ────────────────────────
    // Required at signup, editable via PUT /api/users/update-profile.
    // Stored as a string to preserve leading zeros and international formats.
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        // Accepts exactly 10 digits (Indian format) or international with +
        validator: (v) => /^\+?[0-9]{10,15}$/.test(v),
        message: "Phone number must be 10–15 digits (optionally starting with +)",
      },
    },

    // AI virtual user flag (kept from AI feature)
    isAI: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
