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

  // 🔥 AFTER LOGIN/SIGNUP
  _onAuthenticated: (socket) => {
    socket.on("getOnlineUsers", (users) => set({ onlineUsers: users }));

    socket.on("incoming-call", ({ from, roomId, callerName }) => {
      set({ incomingCall: { from, roomId, callerName } });
    });

    useContactStore.getState().fetchAliases();
  },

  // 🔍 CHECK AUTH (ON APP LOAD)
  checkAuth: async () => {
    try {
      set({ isCheckingAuth: true });

      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data, isCheckingAuth: false });

      // ✅ CONNECT SOCKET (NO userId needed now)
      const socket = connectSocket();
      get()._onAuthenticated(socket);

    } catch (error) {
      set({ authUser: null, isCheckingAuth: false });
    }
  },

  // 🔐 LOGIN
  login: async (data) => {
    set({ isLoggingIn: true });

    try {
      const res = await axiosInstance.post("/auth/login", data);

      // ✅ SAVE TOKEN
      localStorage.setItem("token", res.data.token);

      // ✅ SAVE USER
      set({ authUser: res.data.user });

      toast.success("Logged in successfully");

      // ✅ CONNECT SOCKET
      const socket = connectSocket();
      get()._onAuthenticated(socket);

    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // 📝 SIGNUP
  signup: async (data) => {
    set({ isSigningUp: true });

    try {
      const res = await axiosInstance.post("/auth/signup", data);

      // ✅ SAVE TOKEN
      localStorage.setItem("token", res.data.token);

      // ✅ SAVE USER
      set({ authUser: res.data.user });

      toast.success("Account created");

      // ✅ CONNECT SOCKET
      const socket = connectSocket();
      get()._onAuthenticated(socket);

    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  // 🚪 LOGOUT
  logout: async () => {
    try {
      // ❌ NO NEED backend logout anymore
      localStorage.removeItem("token");

      disconnectSocket();

      set({
        authUser: null,
        onlineUsers: [],
        incomingCall: null,
      });

      useContactStore.setState({ aliasMap: {} });

      toast.success("Logged out");

    } catch (error) {
      toast.error("Logout failed");
    }
  },

  // 👤 UPDATE PROFILE
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });

    try {
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