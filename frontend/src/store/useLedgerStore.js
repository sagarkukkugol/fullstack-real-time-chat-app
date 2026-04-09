import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { getSocket } from "../lib/socket";

// 2-minute delete window (matches backend constant)
const DELETE_WINDOW_MS = 2 * 60 * 1000;

export const useLedgerStore = create((set, get) => ({
  // ── Ledger panel state ────────────────────────
  transactions: [],
  balance: null,
  isLedgerOpen: false,
  isLoading: false,
  isSubmitting: false,
  currentOtherUserId: null,

  // ── Green dot state ───────────────────────────
  // Set of userIds who have sent unseen transactions to the current user.
  // We use a plain object { userId: true } for O(1) lookups in the sidebar render.
  unseenFromUsers: {}, // { "userId1": true, "userId3": true }

  // ── Panel toggle ──────────────────────────────
  toggleLedger: () => set((s) => ({ isLedgerOpen: !s.isLedgerOpen })),
  closeLedger: () => set({ isLedgerOpen: false }),

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch all unseen sender IDs on app load (populates green dots in sidebar)
  // Called once after login / checkAuth from useAuthStore.
  // ─────────────────────────────────────────────────────────────────────────
  fetchUnseenSenders: async () => {
    try {
      const res = await axiosInstance.get("/ledger/unseen");
      // res.data = ["userId1", "userId3"]
      const map = {};
      res.data.forEach((id) => { map[id] = true; });
      set({ unseenFromUsers: map });
    } catch (error) {
      console.error("fetchUnseenSenders error:", error);
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Mark all transactions from a specific user as seen.
  // Called when the current user opens that user's chat or ledger panel.
  // Removes the green dot immediately in the UI, then confirms with the API.
  // ─────────────────────────────────────────────────────────────────────────
  markSeenFromUser: async (fromUserId) => {
    if (!fromUserId) return;

    // Remove green dot immediately (optimistic update — feels instant)
    set((s) => {
      const updated = { ...s.unseenFromUsers };
      delete updated[fromUserId];
      return { unseenFromUsers: updated };
    });

    // Confirm with backend (fire-and-forget)
    try {
      await axiosInstance.patch(`/ledger/transactions/seen/${fromUserId}`);
    } catch (error) {
      console.error("markSeenFromUser error:", error);
      // Re-add on failure so the dot isn't incorrectly hidden
      set((s) => ({ unseenFromUsers: { ...s.unseenFromUsers, [fromUserId]: true } }));
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Subscribe to real-time ledger socket events.
  // Call this once after the socket connects (from useAuthStore after login).
  // ─────────────────────────────────────────────────────────────────────────
  subscribeToLedgerEvents: () => {
    const socket = getSocket();
    if (!socket) return;

    // Remove old listeners to prevent duplicates on re-login
    socket.off("ledger:newTransaction");
    socket.off("ledger:deleteTransaction");
    socket.off("ledger:unseenUpdate");

    // ── Someone added a transaction involving me ──
    socket.on("ledger:newTransaction", ({ transaction, addedByName }) => {
      const { currentOtherUserId } = get();

      // Show toast regardless of whether the ledger panel is open
      toast(`💰 ${addedByName} added ₹${transaction.amount} ${transaction.type} entry`, {
        icon: transaction.type === "credit" ? "📈" : "📉",
        duration: 4000,
      });

      // If the ledger panel is showing this same user → update the list
      if (
        currentOtherUserId &&
        (transaction.fromUserId?.toString() === currentOtherUserId ||
          transaction.toUserId?.toString() === currentOtherUserId)
      ) {
        set((s) => ({ transactions: [transaction, ...s.transactions] }));
        get().fetchBalance(currentOtherUserId);
      }
    });

    // ── Backend emits this to add/update a green dot ──
    socket.on("ledger:unseenUpdate", ({ fromUserId, hasUnseen }) => {
      set((s) => {
        const updated = { ...s.unseenFromUsers };
        if (hasUnseen) {
          updated[fromUserId] = true;
        } else {
          delete updated[fromUserId];
        }
        return { unseenFromUsers: updated };
      });
    });

    // ── Someone deleted a transaction ──
    socket.on("ledger:deleteTransaction", ({ transactionId }) => {
      set((s) => ({
        transactions: s.transactions.filter((t) => t._id !== transactionId),
      }));
      const { currentOtherUserId } = get();
      if (currentOtherUserId) get().fetchBalance(currentOtherUserId);
    });
  },

  unsubscribeFromLedgerEvents: () => {
    const socket = getSocket();
    if (socket) {
      socket.off("ledger:newTransaction");
      socket.off("ledger:deleteTransaction");
      socket.off("ledger:unseenUpdate");
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch transactions between current user and otherUserId
  // ─────────────────────────────────────────────────────────────────────────
  fetchTransactions: async (otherUserId) => {
    if (!otherUserId) return;
    set({ isLoading: true, currentOtherUserId: otherUserId });
    try {
      const res = await axiosInstance.get(`/ledger/transactions/${otherUserId}`);
      set({ transactions: res.data });
    } catch (error) {
      toast.error("Failed to load ledger transactions.");
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBalance: async (otherUserId) => {
    if (!otherUserId) return;
    try {
      const res = await axiosInstance.get(`/ledger/balance/${otherUserId}`);
      set({ balance: res.data });
    } catch (error) {
      console.error("fetchBalance error:", error);
    }
  },

  addTransaction: async (otherUserId, { amount, type, note }) => {
    set({ isSubmitting: true });
    try {
      const res = await axiosInstance.post("/ledger/transactions", {
        toUserId: otherUserId,
        amount,
        type,
        note,
      });
      set((s) => ({ transactions: [res.data, ...s.transactions] }));
      await get().fetchBalance(otherUserId);
      toast.success(`${type === "credit" ? "Credit ↑" : "Debit ↓"} entry added!`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add transaction.");
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteTransaction: async (transactionId, otherUserId) => {
    const { transactions } = get();
    const t = transactions.find((tx) => tx._id === transactionId);
    if (t) {
      const ageMs = Date.now() - new Date(t.createdAt).getTime();
      if (ageMs > DELETE_WINDOW_MS) {
        toast.error("Delete window expired (2 minutes).");
        return;
      }
    }
    try {
      await axiosInstance.delete(`/ledger/transactions/${transactionId}`);
      set((s) => ({
        transactions: s.transactions.filter((tx) => tx._id !== transactionId),
      }));
      await get().fetchBalance(otherUserId);
      toast.success("Transaction deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete transaction.");
    }
  },

  clearLedger: () =>
    set({ transactions: [], balance: null, isLedgerOpen: false, currentOtherUserId: null }),
}));
