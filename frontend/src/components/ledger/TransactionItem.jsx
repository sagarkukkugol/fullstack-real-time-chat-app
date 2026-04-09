import { useState, useEffect } from "react";
import { Trash2, Clock } from "lucide-react";
import { useLedgerStore } from "../../store/useLedgerStore";
import { useAuthStore } from "../../store/useAuthStore";

// 2-minute delete window (matches backend)
const DELETE_WINDOW_MS = 2 * 60 * 1000;

/**
 * TransactionItem
 *
 * FIXES / NEW:
 *   1. Secure owner-only delete: checks isMe before showing delete button.
 *   2. 2-minute countdown timer: shows remaining time to delete.
 *      The delete button disables automatically when the window closes.
 *   3. Colour logic is always from the logged-in user's perspective.
 */
const TransactionItem = ({ transaction, otherUserId }) => {
  const { deleteTransaction } = useLedgerStore();
  const { authUser } = useAuthStore();

  // ── Ownership ──────────────────────────────────
  // Compare string IDs (Mongo ObjectId vs plain string)
  const isMe = transaction.fromUserId?.toString() === authUser._id?.toString();

  // ── 2-minute delete window timer ──────────────
  const [msLeft, setMsLeft] = useState(() => {
    const age = Date.now() - new Date(transaction.createdAt).getTime();
    return Math.max(0, DELETE_WINDOW_MS - age);
  });

  useEffect(() => {
    if (!isMe || msLeft <= 0) return; // non-owners don't need the timer

    const interval = setInterval(() => {
      const age = Date.now() - new Date(transaction.createdAt).getTime();
      const remaining = Math.max(0, DELETE_WINDOW_MS - age);
      setMsLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMe, transaction.createdAt]);

  const canDelete = isMe && msLeft > 0;
  const secondsLeft = Math.ceil(msLeft / 1000);

  // ── Colour / label logic ──────────────────────
  // Always shown from the LOGGED-IN user's perspective
  let isPositive, displayLabel;
  if (isMe) {
    isPositive = transaction.type === "credit"; // I gave → positive (they owe me)
    displayLabel = transaction.type === "credit" ? "You gave" : "You received";
  } else {
    isPositive = transaction.type === "debit"; // they received from me → positive
    displayLabel = transaction.type === "credit" ? "They gave you" : "They received";
  }

  // ── Date string ───────────────────────────────
  const dateStr = new Date(transaction.createdAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Handle delete ─────────────────────────────
  const handleDelete = () => {
    if (!canDelete) return;
    if (window.confirm(`Delete this ₹${transaction.amount} entry?`)) {
      deleteTransaction(transaction._id, otherUserId);
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border mb-2 transition-all ${
        isPositive
          ? "bg-emerald-50 border-emerald-100"
          : "bg-red-50 border-red-100"
      }`}
    >
      {/* Left: colour circle + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg font-bold ${
            isPositive
              ? "bg-emerald-100 text-emerald-600"
              : "bg-red-100 text-red-500"
          }`}
        >
          {isPositive ? "+" : "−"}
        </div>

        <div className="min-w-0">
          <p
            className={`text-base font-bold ${
              isPositive ? "text-emerald-700" : "text-red-600"
            }`}
          >
            ₹{transaction.amount.toFixed(2)}
          </p>
          <p className="text-xs text-base-content/60 truncate">
            {displayLabel}
            {transaction.note ? ` · ${transaction.note}` : ""}
          </p>
          <p className="text-xs text-base-content/40">{dateStr}</p>
        </div>
      </div>

      {/* Right: delete button (owner only) */}
      {isMe && (
        <div className="flex flex-col items-center ml-2 shrink-0">
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            className={`btn btn-xs gap-1 ${
              canDelete
                ? "btn-ghost text-error hover:bg-red-50"
                : "btn-disabled opacity-30 cursor-not-allowed"
            }`}
            title={
              canDelete
                ? `Delete (${secondsLeft}s left)`
                : "Delete window expired"
            }
          >
            <Trash2 size={13} />
          </button>

          {/* Countdown badge */}
          {msLeft > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-base-content/40 mt-0.5">
              <Clock size={9} />
              {secondsLeft}s
            </span>
          )}

          {/* Expired label */}
          {msLeft === 0 && (
            <span className="text-xs text-base-content/30 mt-0.5">locked</span>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionItem;
