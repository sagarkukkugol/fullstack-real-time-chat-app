import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, MoreVertical, Pencil, Phone, RotateCcw, X,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useLedgerStore } from "../store/useLedgerStore";
import { useContactStore } from "../store/useContactStore";
import { getSocket } from "../lib/socket";
import UserInfoModal from "./UserInfoModal";
import toast from "react-hot-toast";

/**
 * ChatHeader
 *
 * NEW FEATURES:
 *   1. Clicking the contact name → opens UserInfoModal (real profile info)
 *   2. 3-dot menu (⋮) → "Edit Name" / "Reset to Default"
 *   3. Inline alias edit input with Save / Cancel
 *   4. Display name always reads from aliasMap first (getDisplayName)
 */
const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();
  const { toggleLedger, isLedgerOpen } = useLedgerStore();
  const { getDisplayName, saveAlias, deleteAlias, isSavingAlias } = useContactStore();
  const navigate = useNavigate();

  // ── User info modal ───────────────────────────
  const [showInfoModal, setShowInfoModal] = useState(false);

  // ── 3-dot menu ────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // ── Inline alias edit ─────────────────────────
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState("");

  const displayName = getDisplayName(selectedUser);
  const isAIChat = selectedUser?.isAI === true;

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Listen for call responses
  useEffect(() => {
    const socket = getSocket();
    if (!socket || isAIChat) return;

    const onAccepted = ({ roomId }) => navigate(`/call/${roomId}`);
    const onDeclined = () => toast.error(`${displayName} declined the call.`);

    socket.on("call-accepted", onAccepted);
    socket.on("call-declined", onDeclined);
    return () => {
      socket.off("call-accepted", onAccepted);
      socket.off("call-declined", onDeclined);
    };
  }, [selectedUser._id, navigate, isAIChat, displayName]);

  // ── Call ──────────────────────────────────────
  const handleCall = () => {
    const socket = getSocket();
    if (!socket?.connected) { toast.error("Not connected. Please refresh."); return; }
    const roomId = `${authUser._id}-${selectedUser._id}`;
    socket.emit("call-user", { to: selectedUser._id, from: authUser._id, callerName: authUser.fullName, roomId });
    navigate(`/call/${roomId}`);
  };

  // ── Open alias edit ───────────────────────────
  const startEditAlias = () => {
    setAliasInput(displayName); // pre-fill with current name (alias or real)
    setEditingAlias(true);
    setMenuOpen(false);
  };

  // ── Save alias ────────────────────────────────
  const handleSaveAlias = async () => {
    const ok = await saveAlias(selectedUser._id, aliasInput);
    if (ok) setEditingAlias(false);
  };

  // ── Reset alias ───────────────────────────────
  const handleResetAlias = async () => {
    await deleteAlias(selectedUser._id);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">

          {/* Left: avatar + name */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="avatar">
              <div className="size-10 rounded-full relative bg-primary/10 flex items-center justify-center">
                {isAIChat && !selectedUser.profilePic ? (
                  <span className="text-xl">🤖</span>
                ) : (
                  <img
                    src={selectedUser.profilePic || "/avatar.png"}
                    alt={displayName}
                    className="rounded-full"
                  />
                )}
              </div>
            </div>

            {/* Name + status */}
            <div>
              {editingAlias ? (
                /* ── Inline alias edit input ── */
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-36"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveAlias();
                      if (e.key === "Escape") setEditingAlias(false);
                    }}
                    autoFocus
                    maxLength={60}
                  />
                  <button
                    onClick={handleSaveAlias}
                    disabled={isSavingAlias}
                    className="btn btn-xs btn-primary"
                  >
                    {isSavingAlias ? <span className="loading loading-spinner loading-xs" /> : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingAlias(false)}
                    className="btn btn-xs btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                /* ── Clickable name → user info modal ── */
                <button
                  onClick={() => !isAIChat && setShowInfoModal(true)}
                  className={`font-medium text-left leading-tight block ${
                    !isAIChat ? "hover:text-primary transition-colors cursor-pointer" : "cursor-default"
                  }`}
                  title={!isAIChat ? "View contact info" : undefined}
                >
                  {displayName}
                  {isAIChat && (
                    <span className="badge badge-primary badge-xs ml-1 align-middle">AI</span>
                  )}
                </button>
              )}

              <p className="text-sm text-base-content/60">
                {isAIChat
                  ? "Powered by OpenAI"
                  : onlineUsers.includes(selectedUser._id)
                  ? "Online"
                  : "Offline"}
              </p>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1">
            {!isAIChat && (
              <>
                {/* Call */}
                <button onClick={handleCall} className="btn btn-ghost btn-sm btn-circle" title="Video call">
                  <Phone size={18} />
                </button>

                {/* Ledger */}
                <button
                  onClick={toggleLedger}
                  className={`btn btn-sm btn-circle transition-colors ${
                    isLedgerOpen ? "btn-primary text-primary-content" : "btn-ghost"
                  }`}
                  title="Ledger"
                >
                  <BookOpen size={18} />
                </button>

                {/* ── 3-dot menu ── */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="btn btn-ghost btn-sm btn-circle"
                    title="More options"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-10 z-50 w-44 bg-base-100 border border-base-300 rounded-xl shadow-xl overflow-hidden">
                      <button
                        onClick={startEditAlias}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-base-200 transition-colors text-left"
                      >
                        <Pencil size={14} className="text-primary" />
                        Edit Name
                      </button>
                      <button
                        onClick={handleResetAlias}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-base-200 transition-colors text-left"
                      >
                        <RotateCcw size={14} className="text-zinc-400" />
                        Reset to Default
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Close chat */}
            <button onClick={() => setSelectedUser(null)} className="btn btn-ghost btn-sm btn-circle">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── User Info Modal ── */}
      {showInfoModal && (
        <UserInfoModal
          userId={selectedUser._id}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </>
  );
};

export default ChatHeader;
