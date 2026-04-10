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

  // ── AI typing indicator state ─────────────────
  // true while we're waiting for the AI to reply
  isAITyping: false,

  // ── Sidebar users ─────────────────────────────
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/api/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  // ── Fetch messages ─────────────────────────────
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

  // ── Send message ───────────────────────────────
  // Adds the sent message to state immediately (sender sees it right away).
  // The receiver (or AI reply) comes back via socket "newMessage" event.
  sendMessage: async (messageData) => {
    try {
      const { selectedUser } = get();
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      // Add sender's own message instantly — dedup guard in addMessage prevents doubles
      get().addMessage(res.data);
    } catch (error) {
      console.error("sendMessage error:", error);
      toast.error("Failed to send message");
    }
  },

  // ── Dedup-safe message adder ───────────────────
  // Called both from sendMessage (API response) and the socket "newMessage" handler.
  // If a message with the same _id is already in state, it is skipped.
  // This prevents the classic "message appears twice" bug.
  addMessage: (message) => {
    set((state) => {
      const alreadyExists = state.messages.some((m) => m._id === message._id);
      if (alreadyExists) return state; // no change — prevents duplicate
      return { messages: [...state.messages, message] };
    });
  },

  // ── Subscribe to incoming messages + AI events ─
  // Pass the current selectedUser so the filter is never stale.
  subscribeToMessages: (selectedUser) => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("newMessage");
    socket.off("ai:typing");
    socket.off("ai:stopTyping");

    // New chat message (human or AI reply)
    socket.on("newMessage", (message) => {
      if (
        selectedUser &&
        (message.senderId === selectedUser._id ||
          message.receiverId === selectedUser._id)
      ) {
        get().addMessage(message);
        // If this is the AI replying, make sure typing indicator is cleared
        if (message.isAI) {
          set({ isAITyping: false });
        }
      }
    });

    // AI started "thinking"
    socket.on("ai:typing", () => {
      set({ isAITyping: true });
    });

    // AI finished — hide indicator (also cleared when the message arrives)
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

  // ── Clear chat history ─────────────────────────
  // Calls the soft-delete API and wipes local state for this conversation.
  // The other user / AI chat is completely unaffected.
  clearChatHistory: async () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    set({ isClearingChat: true });
    try {
      await axiosInstance.delete(`/api/messages/clear/${selectedUser._id}`);
      set({ messages: [] }); // clear from UI immediately
      toast.success("Chat history cleared.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clear chat.");
    } finally {
      set({ isClearingChat: false });
    }
  },
}));
