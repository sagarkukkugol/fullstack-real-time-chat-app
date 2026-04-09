import { useEffect, useState } from "react";
import { Mail, Phone, User, X, Calendar } from "lucide-react";
import { axiosInstance } from "../lib/axios";

/**
 * UserInfoModal
 *
 * Shows the REAL profile info of a user (never the alias).
 * Opens when the user clicks on the contact name in the chat header.
 *
 * Props:
 *   userId   – ID of the user to fetch
 *   onClose  – callback to close the modal
 */
const UserInfoModal = ({ userId, onClose }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await axiosInstance.get(`/contacts/user-info/${userId}`);
        setUserInfo(res.data);
      } catch (err) {
        setError("Could not load user info.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, [userId]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <h2 className="font-semibold text-base">Contact Info</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading && (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary loading-md" />
            </div>
          )}

          {error && (
            <p className="text-center text-error py-8 text-sm">{error}</p>
          )}

          {userInfo && (
            <div className="space-y-5">
              {/* Avatar + name */}
              <div className="flex flex-col items-center gap-3">
                <img
                  src={userInfo.profilePic || "/avatar.png"}
                  alt={userInfo.fullName}
                  className="size-20 rounded-full object-cover border-4 border-base-300"
                />
                <div className="text-center">
                  <p className="text-lg font-bold">{userInfo.fullName}</p>
                  <p className="text-xs text-base-content/40 mt-0.5">
                    Real name — not your contact alias
                  </p>
                </div>
              </div>

              <div className="divider my-2" />

              {/* Info rows */}
              <div className="space-y-4">
                {/* Full Name */}
                <InfoRow icon={User} label="Full Name" value={userInfo.fullName} />

                {/* Email */}
                <InfoRow icon={Mail} label="Email" value={userInfo.email} />

                {/* Phone */}
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={userInfo.phoneNumber || "Not provided"}
                  muted={!userInfo.phoneNumber}
                />

                {/* Joined */}
                <InfoRow
                  icon={Calendar}
                  label="Joined"
                  value={new Date(userInfo.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Small helper row ──────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, muted = false }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={15} className="text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-base-content/40 mb-0.5">{label}</p>
      <p className={`text-sm font-medium break-all ${muted ? "text-base-content/30" : ""}`}>
        {value}
      </p>
    </div>
  </div>
);

export default UserInfoModal;
