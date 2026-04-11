import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useContactStore = create((set, get) => ({
  aliasMap: {},
  isLoadingAliases: false,
  isSavingAlias: false,

  getDisplayName: (user) => {
    if (!user) return "";
    return get().aliasMap[user._id] ?? user.fullName;
  },

  fetchAliases: async () => {
    set({ isLoadingAliases: true });
    try {
      // ✅ FIX: /contacts/aliases not /api/contacts/aliases
      const res = await axiosInstance.get("/contacts/aliases");
      set({ aliasMap: res.data });
    } catch (error) {
      console.error("fetchAliases error:", error);
    } finally {
      set({ isLoadingAliases: false });
    }
  },

  saveAlias: async (contactUserId, customName) => {
    if (!customName?.trim()) {
      toast.error("Name cannot be empty");
      return false;
    }
    set({ isSavingAlias: true });
    try {
      // ✅ FIX: /contacts/alias not /api/contacts/alias
      await axiosInstance.post("/contacts/alias", {
        contactUserId,
        customName: customName.trim(),
      });
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

  deleteAlias: async (contactUserId) => {
    try {
      // ✅ FIX: /contacts/alias/... not /api/contacts/alias/...
      await axiosInstance.delete(`/contacts/alias/${contactUserId}`);
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