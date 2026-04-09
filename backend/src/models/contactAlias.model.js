import mongoose from "mongoose";

/**
 * ContactAlias Schema
 *
 * Stores a custom name that one user (ownerId) gives to another user (contactUserId).
 * This is purely a view-layer override — it never modifies the actual user's fullName.
 *
 * Example:
 *   User A (ownerId) renames User B (contactUserId) to "Rajath".
 *   Only A sees "Rajath". B and everyone else still see B's real name.
 *
 * The compound unique index on [ownerId, contactUserId] ensures:
 *   - Each pair can only have ONE alias entry
 *   - Upsert (save/update) operations are safe and idempotent
 */
const contactAliasSchema = new mongoose.Schema(
  {
    // The user who SET the custom name
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The user being renamed (only for ownerId's view)
    contactUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The custom name ownerId chose for contactUserId
    customName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [60, "Custom name cannot exceed 60 characters"],
    },
  },
  { timestamps: true }
);

// ── Compound unique index ──────────────────────────────────────────────────
// Prevents duplicate alias entries for the same pair.
// Also used as the lookup key for upsert operations.
contactAliasSchema.index({ ownerId: 1, contactUserId: 1 }, { unique: true });

const ContactAlias = mongoose.model("ContactAlias", contactAliasSchema);

export default ContactAlias;
