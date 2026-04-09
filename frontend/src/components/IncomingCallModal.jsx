import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getSocket } from "../lib/socket";
import { Phone, PhoneOff } from "lucide-react";

/**
 * IncomingCallModal
 *
 * Renders a full-screen overlay when someone calls you.
 * Reads incomingCall from useAuthStore (set by the global socket listener).
 *
 * Place this ONCE inside App.jsx so it's always mounted.
 *
 * Usage in App.jsx:
 *   import IncomingCallModal from "./components/IncomingCallModal";
 *   // inside the return JSX:
 *   <IncomingCallModal />
 */
const IncomingCallModal = () => {
  const { incomingCall, clearIncomingCall } = useAuthStore();
  const navigate = useNavigate();

  if (!incomingCall) return null;

  const { from, roomId, callerName } = incomingCall;

  // ── Accept: notify caller then navigate to call page ──
  const handleAccept = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit("accept-call", { to: from, roomId });
    }
    clearIncomingCall();
    navigate(`/call/${roomId}`);
  };

  // ── Decline: notify caller and dismiss ──
  const handleDecline = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit("decline-call", { to: from });
    }
    clearIncomingCall();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6 w-80 animate-bounce-in">
        {/* Avatar / icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
          📞
        </div>

        <div className="text-center">
          <p className="text-lg font-bold">{callerName || "Someone"}</p>
          <p className="text-sm text-base-content/60">Incoming video call…</p>
        </div>

        <div className="flex gap-6">
          {/* Decline */}
          <button
            onClick={handleDecline}
            className="btn btn-circle btn-error btn-lg"
            title="Decline"
          >
            <PhoneOff size={24} />
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="btn btn-circle btn-success btn-lg"
            title="Accept"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
