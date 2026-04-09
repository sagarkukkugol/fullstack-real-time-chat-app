import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Lock, Mail, Phone, Save, User, X } from "lucide-react";
import toast from "react-hot-toast";

/**
 * ProfilePage
 *
 * Editable fields  : fullName, phoneNumber, profilePic
 * Locked fields    : email (immutable), password (shown as ••••••••, no edit)
 *
 * Sends only the changed fields to PUT /api/auth/update-profile
 * so unchanged data is never overwritten.
 */
const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();

  // ── Profile picture ───────────────────────────
  const [selectedImg, setSelectedImg] = useState(null);

  // ── Editable form state ───────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(authUser?.phoneNumber || "");

  // ── Avatar upload ─────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result;
      setSelectedImg(base64);
      await updateProfile({ profilePic: base64 });
    };
  };

  // ── Save editable fields ──────────────────────
  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    if (phoneNumber && !/^\+?[0-9]{10,15}$/.test(phoneNumber.trim())) {
      toast.error("Enter a valid phone number");
      return;
    }
    await updateProfile({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
    });
    setIsEditing(false);
  };

  // ── Cancel edits ──────────────────────────────
  const handleCancel = () => {
    setFullName(authUser?.fullName || "");
    setPhoneNumber(authUser?.phoneNumber || "");
    setIsEditing(false);
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-1 text-base-content/60 text-sm">Manage your account information</p>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 border-base-content/10"
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading…" : "Click the camera icon to update your photo"}
            </p>
          </div>

          {/* Form fields */}
          <div className="space-y-5">

            {/* ── Full Name (EDITABLE) ── */}
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
                <span className="text-xs text-primary/70 ml-auto">Editable</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  autoFocus
                />
              ) : (
                <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.fullName}</p>
              )}
            </div>

            {/* ── Phone Number (EDITABLE) ── */}
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
                <span className="text-xs text-primary/70 ml-auto">Editable</span>
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="9876543210"
                  maxLength={16}
                />
              ) : (
                <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                  {authUser?.phoneNumber || "—"}
                </p>
              )}
            </div>

            {/* ── Email (LOCKED) ── */}
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
                <span className="text-xs text-zinc-500 ml-auto">Cannot be changed</span>
              </label>
              <p className="px-4 py-2.5 bg-base-200/50 rounded-lg border border-dashed text-base-content/40 cursor-not-allowed">
                {authUser?.email}
              </p>
            </div>

            {/* ── Password (LOCKED display) ── */}
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
                <span className="text-xs text-zinc-500 ml-auto">Cannot be changed here</span>
              </label>
              <p className="px-4 py-2.5 bg-base-200/50 rounded-lg border border-dashed text-base-content/30 cursor-not-allowed tracking-widest">
                ••••••••
              </p>
            </div>
          </div>

          {/* ── Edit / Save / Cancel buttons ── */}
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isUpdatingProfile}
                  className="btn btn-primary flex-1 gap-2"
                >
                  {isUpdatingProfile ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Changes
                </button>
                <button onClick={handleCancel} className="btn btn-ghost gap-2">
                  <X size={16} />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-outline flex-1"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Account info */}
          <div className="bg-base-300 rounded-xl p-4 border border-base-content/10">
            <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
              Account Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser?.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500 flex items-center gap-1">
                  <span className="size-2 rounded-full bg-green-500 inline-block" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
