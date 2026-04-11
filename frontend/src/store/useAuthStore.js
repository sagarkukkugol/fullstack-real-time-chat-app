import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { useContactStore } from "./useContactStore";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  incomingCall: null,

  setIncomingCall: (call) => set({ incomingCall: call }),
  clearIncomingCall: () => set({ incomingCall: null }),

  _onAuthenticated: (socket) => {
    socket.on("getOnlineUsers", (users) => set({ onlineUsers: users }));
    socket.on("incoming-call", ({ from, roomId, callerName }) => {
      set({ incomingCall: { from, roomId, callerName } });
    });
    useContactStore.getState().fetchAliases();
  },

  checkAuth: async () => {
    try {
      set({ isCheckingAuth: true });
      // ✅ FIX: baseURL already has /api — use /auth/check NOT /api/auth/check
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data, isCheckingAuth: false });
      const socket = connectSocket(res.data._id);
      get()._onAuthenticated(socket);
    } catch (error) {
      set({ authUser: null, isCheckingAuth: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      // ✅ FIX: /auth/login not /api/auth/login
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      const socket = connectSocket(res.data._id);
      get()._onAuthenticated(socket);
    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      // ✅ FIX: /auth/signup not /api/auth/signup
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created");
      const socket = connectSocket(res.data._id);
      get()._onAuthenticated(socket);
    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  logout: async () => {
    try {
      // ✅ FIX: /auth/logout not /api/auth/logout
      await axiosInstance.post("/auth/logout");
      disconnectSocket();
      set({ authUser: null, onlineUsers: [], incomingCall: null });
      useContactStore.setState({ aliasMap: {} });
      toast.success("Logged out");
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      // ✅ FIX: /auth/update-profile not /api/auth/update-profile
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}));
