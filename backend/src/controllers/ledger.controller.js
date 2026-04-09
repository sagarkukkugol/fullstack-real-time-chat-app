import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import PDFDocument from "pdfkit";

// ─── Constants ───────────────────────────────────────────────────────────────
const DELETE_WINDOW_MS = 2 * 60 * 1000; // 2-minute delete window

// ─── Helper ──────────────────────────────────────────────────────────────────
// Returns the $or query for all transactions between two users (both directions)
const pairQuery = (userA, userB) => ({
  $or: [
    { fromUserId: userA, toUserId: userB },
    { fromUserId: userB, toUserId: userA },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ledger/transactions
// Create a new credit/debit entry.
//
// NEW: Sets seen = false and emits "transactionNotification" via socket.
//      If receiver is OFFLINE → record stays seen:false in DB.
//      If receiver is ONLINE  → they get the socket event + their UI updates.
//      Either way, on next login/sidebar load we query unseen transactions.
// ─────────────────────────────────────────────────────────────────────────────
export const addTransaction = async (req, res) => {
  try {
    const { toUserId, amount, type, note, messageRef } = req.body;
    const fromUserId = req.user._id;

    // ── Validation ───────────────────────────────
    if (!toUserId || !amount || !type) {
      return res.status(400).json({ message: "toUserId, amount, and type are required." });
    }
    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ message: "type must be 'credit' or 'debit'." });
    }
    if (Number(amount) <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number." });
    }

    const otherUser = await User.findById(toUserId);
    if (!otherUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    // ── Save transaction with seen = false ────────
    const transaction = await Transaction.create({
      fromUserId,
      toUserId,
      amount: Number(amount),
      type,
      note: note || "",
      messageRef: messageRef || null,
      seen: false, // ← receiver has not seen it yet
    });

    // ── Emit real-time socket events ──────────────

    // 1. Notify the RECEIVER about the new transaction (for green dot + toast)
    const receiverSocketId = getReceiverSocketId(toUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ledger:newTransaction", {
        transaction,
        addedByName: req.user.fullName,
      });

      // Also send an updated unseen count so their sidebar dot appears immediately
      io.to(receiverSocketId).emit("ledger:unseenUpdate", {
        fromUserId: fromUserId.toString(),
        hasUnseen: true,
      });
    }
    // If receiver is OFFLINE → socket emit silently does nothing.
    // seen:false in DB ensures the dot appears when they come back online.

    return res.status(201).json(transaction);
  } catch (error) {
    console.error("addTransaction error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ledger/transactions/:userId
// Fetch all transactions between logged-in user and :userId (newest first)
// ─────────────────────────────────────────────────────────────────────────────
export const getTransactions = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    const transactions = await Transaction.find(pairQuery(currentUserId, otherUserId))
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(transactions);
  } catch (error) {
    console.error("getTransactions error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ledger/balance/:userId
// Net balance between current user and :userId
// ─────────────────────────────────────────────────────────────────────────────
export const getBalance = async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    const otherUserId = req.params.userId;

    const transactions = await Transaction.find(pairQuery(currentUserId, otherUserId)).lean();

    let balance = 0;
    for (const t of transactions) {
      const isMe = t.fromUserId.toString() === currentUserId;
      if (isMe) {
        balance += t.type === "credit" ? t.amount : -t.amount;
      } else {
        balance += t.type === "debit" ? t.amount : -t.amount;
      }
    }

    const summary =
      balance > 0
        ? { balance, label: "You will get", amount: balance }
        : balance < 0
        ? { balance, label: "You need to pay", amount: Math.abs(balance) }
        : { balance: 0, label: "All settled up", amount: 0 };

    return res.status(200).json(summary);
  } catch (error) {
    console.error("getBalance error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/ledger/transactions/seen/:fromUserId
// Mark all unseen transactions FROM :fromUserId TO the current user as seen.
//
// Called when the current user opens a chat or the ledger panel.
// This removes the green dot for that specific user in the sidebar.
// ─────────────────────────────────────────────────────────────────────────────
export const markTransactionsSeen = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const fromUserId = req.params.fromUserId;

    // Only update transactions where I am the RECEIVER and they are unseen
    await Transaction.updateMany(
      {
        fromUserId,
        toUserId: currentUserId,
        seen: false,
      },
      { $set: { seen: true } }
    );

    return res.status(200).json({ message: "Transactions marked as seen." });
  } catch (error) {
    console.error("markTransactionsSeen error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ledger/unseen
// Returns an array of fromUserIds who have UNSEEN transactions for the current user.
//
// The sidebar calls this once on load. Result looks like:
//   ["userId1", "userId3"]
// Any userId in this array gets a green dot in the sidebar.
// ─────────────────────────────────────────────────────────────────────────────
export const getUnseenSenders = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Aggregate: find distinct fromUserIds with unseen=false targeted at me
    const results = await Transaction.distinct("fromUserId", {
      toUserId: currentUserId,
      seen: false,
    });

    // Return as plain strings for easy frontend comparison
    return res.status(200).json(results.map((id) => id.toString()));
  } catch (error) {
    console.error("getUnseenSenders error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/ledger/transactions/:transactionId
// Delete a transaction (creator only, within 2-minute window)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const currentUserId = req.user._id;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    if (transaction.fromUserId.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: "You can only delete your own transactions." });
    }

    const ageMs = Date.now() - new Date(transaction.createdAt).getTime();
    if (ageMs > DELETE_WINDOW_MS) {
      return res.status(403).json({
        message: "Delete window expired. Transactions can only be deleted within 2 minutes.",
      });
    }

    await Transaction.findByIdAndDelete(transactionId);

    // Notify the other user in real-time
    const otherUserId = transaction.toUserId.toString();
    const receiverSocketId = getReceiverSocketId(otherUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ledger:deleteTransaction", { transactionId });
    }

    return res.status(200).json({ message: "Transaction deleted." });
  } catch (error) {
    console.error("deleteTransaction error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ledger/transactions/:userId/pdf
// Stream a PDF ledger report
// ─────────────────────────────────────────────────────────────────────────────
export const downloadLedgerPDF = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    const [currentUser, otherUser] = await Promise.all([
      User.findById(currentUserId).lean(),
      User.findById(otherUserId).lean(),
    ]);

    if (!otherUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const transactions = await Transaction.find(pairQuery(currentUserId, otherUserId))
      .sort({ createdAt: 1 })
      .lean();

    let balance = 0;
    for (const t of transactions) {
      const isMe = t.fromUserId.toString() === currentUserId.toString();
      if (isMe) {
        balance += t.type === "credit" ? t.amount : -t.amount;
      } else {
        balance += t.type === "debit" ? t.amount : -t.amount;
      }
    }

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ledger-${currentUser.fullName}-${otherUser.fullName}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(22).fillColor("#1a1a2e").text("Ledger Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#555")
      .text(`Between: ${currentUser.fullName}  &  ${otherUser.fullName}`, { align: "center" });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString("en-IN")}`, { align: "center" });
    doc.moveDown(1);

    const balanceLabel =
      balance > 0 ? "You will get" : balance < 0 ? "You need to pay" : "All settled up";
    const balanceColor = balance > 0 ? "#1a7a4a" : balance < 0 ? "#c0392b" : "#555";
    doc.roundedRect(40, doc.y, 515, 50, 8).fillAndStroke("#f0f4ff", "#d0d8f0");
    doc.fillColor(balanceColor).fontSize(14)
      .text(`${balanceLabel}: Rs.${Math.abs(balance).toFixed(2)}`, 50, doc.y - 40, {
        align: "center", width: 495,
      });
    doc.moveDown(2.5);

    const tableTop = doc.y;
    const cols = { date: 40, type: 150, amount: 220, addedBy: 310, note: 430 };
    const colWidths = { date: 110, type: 70, amount: 90, addedBy: 120, note: 125 };
    doc.rect(40, tableTop, 515, 22).fill("#1a1a2e");
    const headerY = tableTop + 6;
    doc.fillColor("#ffffff").fontSize(9);
    doc.text("Date & Time", cols.date, headerY, { width: colWidths.date });
    doc.text("Type", cols.type, headerY, { width: colWidths.type });
    doc.text("Amount (Rs.)", cols.amount, headerY, { width: colWidths.amount });
    doc.text("Added By", cols.addedBy, headerY, { width: colWidths.addedBy });
    doc.text("Note", cols.note, headerY, { width: colWidths.note });

    let rowY = tableTop + 26;
    let rowIndex = 0;
    for (const t of transactions) {
      const isMe = t.fromUserId.toString() === currentUserId.toString();
      const addedBy = isMe ? currentUser.fullName : otherUser.fullName;
      let displayType, typeColor;
      if (isMe) {
        displayType = t.type === "credit" ? "Credit (Given)" : "Debit (Received)";
        typeColor = t.type === "credit" ? "#1a7a4a" : "#c0392b";
      } else {
        displayType = t.type === "credit" ? "Debit (Given by them)" : "Credit (Received)";
        typeColor = t.type === "credit" ? "#c0392b" : "#1a7a4a";
      }
      doc.rect(40, rowY, 515, 22).fill(rowIndex % 2 === 0 ? "#ffffff" : "#f8f9fa");
      const dateStr = new Date(t.createdAt).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
      doc.fillColor("#333").fontSize(8);
      doc.text(dateStr, cols.date, rowY + 7, { width: colWidths.date });
      doc.fillColor(typeColor).text(displayType, cols.type, rowY + 7, { width: colWidths.type });
      doc.fillColor("#333").text(`Rs.${t.amount.toFixed(2)}`, cols.amount, rowY + 7, { width: colWidths.amount });
      doc.text(addedBy, cols.addedBy, rowY + 7, { width: colWidths.addedBy });
      doc.fillColor("#666").text(t.note || "-", cols.note, rowY + 7, { width: colWidths.note });
      rowY += 22;
      rowIndex++;
      if (rowY > 740) { doc.addPage(); rowY = 40; }
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#aaa").text("Generated by ChatApp Ledger.", { align: "center" });
    doc.end();
  } catch (error) {
    console.error("downloadLedgerPDF error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to generate PDF." });
    }
  }
};
