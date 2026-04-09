import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  clearChatHistory,
} from "../controllers/message.controller.js";

const router = express.Router();

// ── Existing routes (unchanged) ──────────────────
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

// ── New: Clear chat history (soft delete, per user) ──
// DELETE /api/messages/clear/:id
// Clears the conversation with user :id for the logged-in user ONLY.
router.delete("/clear/:id", protectRoute, clearChatHistory);

export default router;
