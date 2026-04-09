import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  saveAlias,
  deleteAlias,
  getMyAliases,
  getUserInfo,
} from "../controllers/contact.controller.js";

const router = express.Router();

// All contact routes require authentication
router.use(protectRoute);

/**
 * GET  /api/contacts/aliases
 * Returns { contactUserId: customName } map for the current user.
 * Called once on sidebar mount.
 */
router.get("/aliases", getMyAliases);

/**
 * POST /api/contacts/alias
 * Body: { contactUserId, customName }
 * Creates or updates a custom name for a contact.
 */
router.post("/alias", saveAlias);

/**
 * DELETE /api/contacts/alias/:contactUserId
 * Removes the alias — contact reverts to their real name.
 */
router.delete("/alias/:contactUserId", deleteAlias);

/**
 * GET /api/contacts/user-info/:userId
 * Returns the real profile (fullName, email, phone) of a user.
 * Used by the User Info panel in the chat header.
 */
router.get("/user-info/:userId", getUserInfo);

export default router;
