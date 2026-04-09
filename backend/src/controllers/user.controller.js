import User from "../models/user.model.js";

/**
 * GET /api/users/search?query=abc
 *
 * Search users by fullName or email (case-insensitive partial match).
 * Excludes the currently logged-in user from results.
 * Returns the same shape as getUsersForSidebar so the frontend can use both interchangeably.
 *
 * If query is empty or missing → returns ALL users (same as sidebar default).
 *
 * Index note: MongoDB uses a collation index for case-insensitive search.
 * The $regex approach below works fine for apps with <50k users.
 * For larger scale, switch to Atlas Search / text indexes.
 */
export const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const rawQuery = (req.query.query || "").trim();

    // Build the search filter
    let filter = { _id: { $ne: currentUserId } }; // always exclude self

    if (rawQuery.length > 0) {
      // Escape special regex characters to prevent injection
      const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i"); // case-insensitive partial match

      filter = {
        ...filter,
        $or: [
          { fullName: { $regex: regex } },
          { email: { $regex: regex } },
        ],
      };
    }

    const users = await User.find(filter)
      .select("-password")  // never expose password hash
      .limit(20)            // safety cap — prevents returning thousands of users
      .lean();

    return res.status(200).json(users);
  } catch (error) {
    console.error("searchUsers error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
