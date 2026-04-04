import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { connectSocket, disconnectSocket } from "../lib/socket"; // BUG FIX #4

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      set({ isCheckingAuth: true });

      const res = await axiosInstance.get("/auth/check");

      set({
        authUser: res.data,
        isCheckingAuth: false,
      });

      const socket = connectSocket(res.data._id);

      socket.on("getOnlineUsers", (users) => {
        set({ onlineUsers: users });
      });
    } catch (error) {
      console.log("AUTH ERROR:", error);

      set({
        authUser: null,
        isCheckingAuth: false,
      });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });

    try {
      const res = await axiosInstance.post("/auth/login", data);

      set({ authUser: res.data });

      toast.success("Logged in successfully");

      const socket = connectSocket(res.data._id);

      socket.on("getOnlineUsers", (users) => {
        set({ onlineUsers: users });
      });
    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });

    try {
      const res = await axiosInstance.post("/auth/signup", data);

      set({ authUser: res.data });

      toast.success("Account created");

      const socket = connectSocket(res.data._id);

      socket.on("getOnlineUsers", (users) => {
        set({ onlineUsers: users });
      });
    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");

      // BUG FIX #4: Use disconnectSocket which also nulls the reference,
      // so the next login creates a fresh socket with the new userId.
      disconnectSocket();

      set({
        authUser: null,
        onlineUsers: [],
      });

      toast.success("Logged out");
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  },
}));