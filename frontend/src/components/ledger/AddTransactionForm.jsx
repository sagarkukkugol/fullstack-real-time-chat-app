import { useState } from "react";
import { useLedgerStore } from "../../store/useLedgerStore";

/**
 * AddTransactionForm
 * Lets the logged-in user add a credit (money given) or debit (money received) entry.
 */
const AddTransactionForm = ({ otherUserId, onSuccess }) => {
  const { addTransaction, isSubmitting } = useLedgerStore();

  const [amount, setAmount] = useState("");
  const [type, setType] = useState("credit"); // "credit" | "debit"
  const [note, setNote] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    const success = await addTransaction(otherUserId, {
      amount: parsedAmount,
      type,
      note: note.trim(),
    });

    if (success) {
      setAmount("");
      setNote("");
      onSuccess?.();
    }
  };

  return (
    <div className="bg-base-200 rounded-xl p-4 mb-4 border border-base-300">
      <h4 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-3">
        Add Entry
      </h4>

      {/* Type Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setType("credit")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
            type === "credit"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "bg-transparent border-emerald-300 text-emerald-600 hover:bg-emerald-50"
          }`}
        >
          ↑ Credit (Given)
        </button>
        <button
          type="button"
          onClick={() => setType("debit")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
            type === "debit"
              ? "bg-red-500 border-red-500 text-white"
              : "bg-transparent border-red-300 text-red-600 hover:bg-red-50"
          }`}
        >
          ↓ Debit (Received)
        </button>
      </div>

      {/* Amount Input */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 font-semibold">
          ₹
        </span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input input-bordered w-full pl-8 text-lg font-bold"
          required
        />
      </div>

      {/* Note Input */}
      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        className="input input-bordered w-full mb-3 text-sm"
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !amount}
        className={`btn w-full font-bold ${
          type === "credit" ? "btn-success" : "btn-error"
        } ${isSubmitting ? "loading" : ""}`}
      >
        {isSubmitting
          ? "Saving..."
          : `Add ${type === "credit" ? "Credit" : "Debit"} Entry`}
      </button>
    </div>
  );
};

export default AddTransactionForm;
