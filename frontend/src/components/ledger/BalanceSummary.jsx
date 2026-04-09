/**
 * BalanceSummary
 * Displays the net balance between the two users in a styled banner.
 * Green = you will receive, Red = you need to pay, Gray = settled.
 */
const BalanceSummary = ({ balance }) => {
  if (!balance) return null;

  const { label, amount, balance: raw } = balance;

  const bgColor =
    raw > 0
      ? "bg-emerald-50 border-emerald-200"
      : raw < 0
      ? "bg-red-50 border-red-200"
      : "bg-gray-50 border-gray-200";

  const textColor =
    raw > 0 ? "text-emerald-700" : raw < 0 ? "text-red-700" : "text-gray-500";

  const icon = raw > 0 ? "📈" : raw < 0 ? "📉" : "✅";

  return (
    <div className={`rounded-xl border-2 p-4 ${bgColor} mb-4`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
        Net Balance
      </p>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={`text-xl font-bold ${textColor}`}>
            ₹{amount.toFixed(2)}
          </p>
          <p className={`text-sm font-medium ${textColor}`}>{label}</p>
        </div>
      </div>
    </div>
  );
};

export default BalanceSummary;
