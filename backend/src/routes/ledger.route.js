import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  addTransaction,
  getTransactions,
  getBalance,
  deleteTransaction,
  downloadLedgerPDF,
  markTransactionsSeen,  // ✅ NEW
  getUnseenSenders,      // ✅ NEW
} from "../controllers/ledger.controller.js";

const router = express.Router();

// All ledger routes require authentication
router.use(protectRoute);

// ── Existing routes (unchanged) ──────────────────────────────────────────────
router.post("/transactions", addTransaction);
router.get("/transactions/:userId", getTransactions);
router.get("/balance/:userId", getBalance);
router.delete("/transactions/:transactionId", deleteTransaction);
router.get("/transactions/:userId/pdf", downloadLedgerPDF);

// ── NEW: Green dot / notification routes ─────────────────────────────────────

/**
 * GET /api/ledger/unseen
 * Returns array of userIds who have sent unseen transactions to the current user.
 * Called once on sidebar mount to initialise the green dots.
 */
router.get("/unseen", getUnseenSenders);

/**
 * PATCH /api/ledger/transactions/seen/:fromUserId
 * Marks all unseen transactions from :fromUserId as seen.
 * Called when the current user opens that person's chat.
 */
router.patch("/transactions/seen/:fromUserId", markTransactionsSeen);

export default router;
