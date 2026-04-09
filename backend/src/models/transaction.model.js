import mongoose from "mongoose";

/**
 * Transaction Schema
 *
 * Stores every ledger entry (credit / debit) between two users.
 *
 * NEW FIELD — seen:
 *   false → the toUserId has NOT yet seen this transaction (green dot)
 *   true  → the toUserId opened the chat / ledger panel (dot removed)
 *
 * This single boolean is the entire "offline notification" mechanism.
 * No separate notification collection needed.
 */
const transactionSchema = new mongoose.Schema(
  {
    // User who CREATED the entry (the one who pressed "Add Credit/Debit")
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The OTHER user in the chat (the one who will receive the notification)
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Amount in INR
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than 0"],
    },

    // credit = fromUser gave money | debit = fromUser received money
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    // Optional note
    note: {
      type: String,
      default: "",
      maxlength: 200,
    },

    // Optional message reference
    messageRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // ── NEW: Notification seen flag ───────────────
    // Set to false when the transaction is created.
    // Set to true when the receiver opens that user's chat or ledger.
    // Used to show/hide the green dot indicator in the sidebar.
    seen: {
      type: Boolean,
      default: false,
      index: true, // indexed because we query { receiverId, seen: false } frequently
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────
// Fast lookup: all transactions between two users (ledger panel)
transactionSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 });

// Fast lookup: all UNSEEN transactions for a specific receiver (green dot query)
// This is the most frequent query — O(1) per user on sidebar load
transactionSchema.index({ toUserId: 1, seen: 1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
