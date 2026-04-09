import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { searchUsers } from "../controllers/user.controller.js";

const router = express.Router();

/**
 * GET /api/users/search?query=abc
 * Search users by name or email. Auth required.
 */
router.get("/search", protectRoute, searchUsers);

export default router;
