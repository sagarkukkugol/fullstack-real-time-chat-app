import { useEffect } from "react";
import { X, Download, BookOpen } from "lucide-react";
import { useLedgerStore } from "../../store/useLedgerStore";
import { useAuthStore } from "../../store/useAuthStore";
import BalanceSummary from "./BalanceSummary";
import AddTransactionForm from "./AddTransactionForm";
import TransactionItem from "./TransactionItem";
import { axiosInstance } from "../../lib/axios";

/**
 * LedgerPanel
 *
 * FIXES / NEW:
 *   - Subscribes to ledger socket events (ledger:newTransaction, ledger:deleteTransaction)
 *     on mount so both users see real-time updates without refreshing.
 *   - Unsubscribes cleanly when the panel unmounts or chat switches.
 */
const LedgerPanel = ({ selectedUser }) => {
  const { authUser } = useAuthStore();
  const {
    transactions,
    balance,
    isLedgerOpen,
    isLoading,
    closeLedger,
    fetchTransactions,
    fetchBalance,
    clearLedger,
    subscribeToLedgerEvents,
    unsubscribeFromLedgerEvents,
  } = useLedgerStore();

  // ── Load data when panel opens ────────────────
  useEffect(() => {
    if (isLedgerOpen && selectedUser?._id) {
      fetchTransactions(selectedUser._id);
      fetchBalance(selectedUser._id);
    }
  }, [isLedgerOpen, selectedUser?._id]);

  // ── Real-time socket subscription ─────────────
  // Subscribe when this component mounts (regardless of whether panel is open)
  // so notifications appear even when the panel is closed.
  useEffect(() => {
    if (selectedUser?._id) {
      subscribeToLedgerEvents(selectedUser._id);
    }
    return () => unsubscribeFromLedgerEvents();
  }, [selectedUser?._id]);

  // ── Clear state when user switches chats ──────
  useEffect(() => {
    return () => clearLedger();
  }, [selectedUser?._id]);

  // ── PDF download ─────────────────────────────
  const handleDownloadPDF = async () => {
    try {
      const response = await axiosInstance.get(
        `/ledger/transactions/${selectedUser._id}/pdf`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `ledger-${authUser.fullName}-${selectedUser.fullName}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
    }
  };

  if (!isLedgerOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={closeLedger}
      />

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 h-full w-full max-w-sm bg-base-100 shadow-2xl z-50
          flex flex-col border-l border-base-300
          transition-transform duration-300
          ${isLedgerOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-200">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <div>
              <h3 className="font-bold text-base">Ledger</h3>
              <p className="text-xs text-base-content/50">with {selectedUser.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="btn btn-ghost btn-sm gap-1 text-primary"
              title="Download PDF"
              disabled={transactions.length === 0}
            >
              <Download size={15} />
              <span className="hidden sm:inline text-xs">PDF</span>
            </button>
            <button onClick={closeLedger} className="btn btn-ghost btn-sm btn-circle">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          <BalanceSummary balance={balance} />
          <AddTransactionForm otherUserId={selectedUser._id} />

          <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-2">
            Transactions ({transactions.length})
          </h4>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary loading-md" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-base-content/40">
              <p className="text-4xl mb-2">📒</p>
              <p className="text-sm">No transactions yet.</p>
              <p className="text-xs mt-1">Add your first entry above.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {transactions.map((t) => (
                <TransactionItem
                  key={t._id}
                  transaction={t}
                  otherUserId={selectedUser._id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LedgerPanel;
