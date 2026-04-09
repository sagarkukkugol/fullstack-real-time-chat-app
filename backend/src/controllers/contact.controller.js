import ContactAlias from "../models/contactAlias.model.js";
import User from "../models/user.model.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/contacts/alias
// Save (or update) a custom name for a contact.
//
// Body: { contactUserId, customName }
//
// Uses MongoDB upsert so calling this twice for the same pair
// updates the name instead of throwing a duplicate-key error.
// ─────────────────────────────────────────────────────────────────────────────
export const saveAlias = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { contactUserId, customName } = req.body;

    if (!contactUserId || !customName?.trim()) {
      return res.status(400).json({ message: "contactUserId and customName are required" });
    }
    if (contactUserId === ownerId.toString()) {
      return res.status(400).json({ message: "You cannot alias yourself" });
    }

    // Confirm the target user actually exists
    const contactExists = await User.findById(contactUserId).lean();
    if (!contactExists) {
      return res.status(404).json({ message: "Contact user not found" });
    }

    // Upsert — create if missing, update if already exists
    const alias = await ContactAlias.findOneAndUpdate(
      { ownerId, contactUserId },              // filter: unique pair
      { customName: customName.trim() },       // update: new name
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(alias);
  } catch (error) {
    console.error("saveAlias error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/contacts/alias/:contactUserId
// Remove the custom alias for a specific contact (reset to their real name).
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAlias = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { contactUserId } = req.params;

    await ContactAlias.findOneAndDelete({ ownerId, contactUserId });

    return res.status(200).json({ message: "Alias removed. Showing default name." });
  } catch (error) {
    console.error("deleteAlias error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/contacts/aliases
// Return all aliases set by the current user, as a lookup map:
//   { "contactUserId1": "Rajath", "contactUserId2": "Boss" }
//
// The frontend merges this map with the user list so every name
// render goes through a single aliasMap[user._id] ?? user.fullName lookup.
// ─────────────────────────────────────────────────────────────────────────────
export const getMyAliases = async (req, res) => {
  try {
    const ownerId = req.user._id;

    const aliases = await ContactAlias.find({ ownerId }).lean();

    // Build a map for O(1) lookup in the frontend
    const aliasMap = {};
    aliases.forEach((a) => {
      aliasMap[a.contactUserId.toString()] = a.customName;
    });

    return res.status(200).json(aliasMap);
  } catch (error) {
    console.error("getMyAliases error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/contacts/user-info/:userId
// Return the REAL profile info of a user (name, email, phone).
// Used by the User Info panel in the chat header — always shows real data,
// never the alias, so the viewer knows who they are actually talking to.
// ─────────────────────────────────────────────────────────────────────────────
export const getUserInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select("fullName email phoneNumber profilePic createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("getUserInfo error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
