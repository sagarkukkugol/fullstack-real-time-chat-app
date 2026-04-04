import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { getSocket } from "../lib/socket";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,

  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });

      if (res.data.length > 0) {
        set({ selectedUser: res.data[0] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error("Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // BUG FIX #1: Add the sent message to state immediately so sender sees it
  sendMessage: async (messageData) => {
    try {
      const { selectedUser } = get();

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );

      // ✅ FIXED: Add message to state so sender sees it right away
      // The receiver will get it via the "newMessage" socket event
      set((state) => ({
        messages: [...state.messages, res.data],
      }));
    } catch (error) {
      console.log("SEND ERROR:", error);
      toast.error("Failed to send message");
    }
  },

  // BUG FIX #3: Accept selectedUser as a parameter so the listener
  // always has the correct current user (not a stale closure value)
  subscribeToMessages: (selectedUser) => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("newMessage"); // prevent duplicate listeners

    socket.on("newMessage", (message) => {
      // Only add if the message belongs to the currently open chat
      if (
        selectedUser &&
        (message.senderId === selectedUser._id ||
          message.receiverId === selectedUser._id)
      ) {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = getSocket();
    if (socket) socket.off("newMessage");
  },
}));