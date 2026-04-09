import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";
import { getChattyResponse } from "../services/aiService.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Build the query to fetch messages between two users,
//         excluding messages the requesting user has cleared.
// ─────────────────────────────────────────────────────────────────────────────
const buildChatQuery = (myId, otherId) => ({
  $or: [
    { senderId: myId, receiverId: otherId },
    { senderId: otherId, receiverId: myId },
  ],
  deletedFor: { $nin: [myId] }, // exclude messages the current user has cleared
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages/users
// Returns all users for the sidebar (excluding logged-in user).
// The Chatty AI user IS included so it appears in the contacts list.
// ─────────────────────────────────────────────────────────────────────────────
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .sort({ isAI: -1, fullName: 1 }); // AI user appears first, then alphabetical

    res.status(200).json(users);
  } catch (error) {
    console.error("getUsersForSidebar error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages/:id
// Fetch chat history between logged-in user and :id.
// Respects soft-delete: messages cleared by this user are excluded.
// ─────────────────────────────────────────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const userToChatId = req.params.id;

    const messages = await Message.find(buildChatQuery(myId, userToChatId))
      .sort({ createdAt: 1 }) // oldest first for display
      .lean();

    res.status(200).json(messages);
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages/send/:id
// Send a message.
//
// Flow:
//   1. Save the user's message to the DB
//   2. Emit it to the receiver (or back to the sender for AI chat)
//   3. If receiver is the AI user:
//      a. Emit "ai:typing" to the sender
//      b. Call OpenAI API
//      c. Save AI reply to DB
//      d. Emit "ai:stopTyping" then "newMessage" (AI reply) to the sender
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { text, fileName } = req.body;

    // ── Handle file/image uploads ──────────────
    let imageUrl = "";
    let fileUrl = "";

    if (req.body.image) {
      const upload = await cloudinary.uploader.upload(req.body.image);
      imageUrl = upload.secure_url;
    }

    if (req.body.file) {
      const upload = await cloudinary.uploader.upload(req.body.file, {
        resource_type: "raw",
        use_filename: true,
        unique_filename: true,
      });
      fileUrl = upload.secure_url;
    }

    // ── Save the user's message ────────────────
    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl,
      file: fileUrl,
      fileName: fileName || "",
      isAI: false,
      deletedFor: [],
    });

    // ── Check if receiver is the AI user ───────
    const receiverUser = await User.findById(receiverId).select("isAI");
    const isAIChat = receiverUser?.isAI === true;

    if (isAIChat) {
      // ── AI CHAT FLOW ───────────────────────────
      // 1. Return the user's message to the sender immediately
      res.status(200).json(newMessage);

      // 2. Get the sender's socket so we can emit typing events
      const senderSocketId = getReceiverSocketId(senderId);

      // 3. Emit "AI is typing..." indicator
      if (senderSocketId) {
        io.to(senderSocketId).emit("ai:typing", { senderId: receiverId });
      }

      // 4. Fetch recent conversation history for context (last 10 messages)
      const history = await Message.find(buildChatQuery(senderId, receiverId))
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Convert DB messages to OpenAI role format
      const openAIHistory = history
        .reverse()
        .slice(0, -1) // exclude the message we just saved (it's the latest user message)
        .map((msg) => ({
          role: msg.isAI ? "assistant" : "user",
          content: msg.text,
        }))
        .filter((m) => m.content); // skip image-only messages

      // 5. Call OpenAI
      let aiReplyText = "";
      try {
        aiReplyText = await getChattyResponse(text || "[user sent a file/image]", openAIHistory);
      } catch (aiError) {
        console.error("OpenAI error:", aiError.message);
        aiReplyText = "Sorry, I'm having trouble responding right now. Please try again!";
      }

      // 6. Stop typing indicator
      if (senderSocketId) {
        io.to(senderSocketId).emit("ai:stopTyping");
      }

      // 7. Save AI reply to DB
      const aiMessage = await Message.create({
        senderId: receiverId,   // AI is the "sender"
        receiverId: senderId,   // back to the human user
        text: aiReplyText,
        isAI: true,
        deletedFor: [],
      });

      // 8. Emit the AI reply to the user in real-time
      if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", aiMessage);
      }
    } else {
      // ── NORMAL CHAT FLOW ────────────────────────
      // Emit to the receiver's socket
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }

      res.status(200).json(newMessage);
    }
  } catch (error) {
    console.error("sendMessage error:", error);
    // Only send response if headers not already sent (AI chat sends early)
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to send message" });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/messages/clear/:id
// Clear chat history with a specific user (soft delete — per user only).
//
// This does NOT delete messages from the database.
// It adds the current user's ID to the `deletedFor` array on every message
// in the conversation. When they fetch messages next time, those are filtered out.
// The OTHER user's view is completely unaffected.
// ─────────────────────────────────────────────────────────────────────────────
export const clearChatHistory = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherUserId = req.params.id;

    // Add myId to deletedFor for all messages in this conversation
    // (both directions) that don't already have me in deletedFor
    const result = await Message.updateMany(
      {
        $or: [
          { senderId: myId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myId },
        ],
        deletedFor: { $nin: [myId] }, // only update if not already cleared
      },
      {
        $push: { deletedFor: myId },
      }
    );

    res.status(200).json({
      message: "Chat history cleared.",
      messagesAffected: result.modifiedCount,
    });
  } catch (error) {
    console.error("clearChatHistory error:", error);
    res.status(500).json({ message: "Failed to clear chat history." });
  }
};
