import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

/**
 * useContactStore
 *
 * Manages the contact alias system:
 *   aliasMap   – { "userId": "Custom Name" } — used everywhere a name is displayed
 *   saveAlias  – save or update a custom name
 *   deleteAlias – reset to the real name
 *
 * Usage pattern in any component:
 *   const { getDisplayName } = useContactStore();
 *   const name = getDisplayName(user); // returns alias if set, otherwise user.fullName
 */
export const useContactStore = create((set, get) => ({
  // { "userId": "Custom Name", ... }
  aliasMap: {},
  isLoadingAliases: false,
  isSavingAlias: false,

  // ── Helper: get the display name for a user ───
  // Always call this instead of user.fullName directly.
  getDisplayName: (user) => {
    if (!user) return "";
    return get().aliasMap[user._id] ?? user.fullName;
  },

  // ── Fetch all aliases on login ────────────────
  // Called once from useAuthStore after authentication.
  fetchAliases: async () => {
    set({ isLoadingAliases: true });
    try {
      const res = await axiosInstance.get("/contacts/aliases");
      set({ aliasMap: res.data }); // res.data = { userId: customName, ... }
    } catch (error) {
      console.error("fetchAliases error:", error);
    } finally {
      set({ isLoadingAliases: false });
    }
  },

  // ── Save / update alias ───────────────────────
  // Returns true on success (so the calling component can close its input).
  saveAlias: async (contactUserId, customName) => {
    if (!customName?.trim()) {
      toast.error("Name cannot be empty");
      return false;
    }
    set({ isSavingAlias: true });
    try {
      await axiosInstance.post("/contacts/alias", { contactUserId, customName: customName.trim() });

      // Update local map immediately — no re-fetch needed
      set((s) => ({
        aliasMap: { ...s.aliasMap, [contactUserId]: customName.trim() },
      }));

      toast.success("Contact name updated");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save alias");
      return false;
    } finally {
      set({ isSavingAlias: false });
    }
  },

  // ── Delete alias (reset to real name) ─────────
  deleteAlias: async (contactUserId) => {
    try {
      await axiosInstance.delete(`/contacts/alias/${contactUserId}`);

      // Remove from local map
      set((s) => {
        const updated = { ...s.aliasMap };
        delete updated[contactUserId];
        return { aliasMap: updated };
      });

      toast.success("Reset to default name");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset name");
    }
  },
}));
