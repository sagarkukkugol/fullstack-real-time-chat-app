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
  isClearingChat: false,
  isAITyping: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      // ✅ FIX: /messages/users not /api/messages/users
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      // ✅ already correct (no /api prefix)
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error("Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    try {
      const { selectedUser } = get();
      // ✅ already correct (no /api prefix)
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      get().addMessage(res.data);
    } catch (error) {
      console.error("sendMessage error:", error);
      toast.error("Failed to send message");
    }
  },

  addMessage: (message) => {
    set((state) => {
      const alreadyExists = state.messages.some((m) => m._id === message._id);
      if (alreadyExists) return state;
      return { messages: [...state.messages, message] };
    });
  },

  subscribeToMessages: (selectedUser) => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("newMessage");
    socket.off("ai:typing");
    socket.off("ai:stopTyping");

    socket.on("newMessage", (message) => {
      if (
        selectedUser &&
        (message.senderId === selectedUser._id ||
          message.receiverId === selectedUser._id)
      ) {
        get().addMessage(message);
        if (message.isAI) {
          set({ isAITyping: false });
        }
      }
    });

    socket.on("ai:typing", () => {
      set({ isAITyping: true });
    });

    socket.on("ai:stopTyping", () => {
      set({ isAITyping: false });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = getSocket();
    if (socket) {
      socket.off("newMessage");
      socket.off("ai:typing");
      socket.off("ai:stopTyping");
    }
    set({ isAITyping: false });
  },

  clearChatHistory: async () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    set({ isClearingChat: true });
    try {
      // ✅ FIX: /messages/clear/... not /api/messages/clear/...
      await axiosInstance.delete(`/messages/clear/${selectedUser._id}`);
      set({ messages: [] });
      toast.success("Chat history cleared.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clear chat.");
    } finally {
      set({ isClearingChat: false });
    }
  },
}));
