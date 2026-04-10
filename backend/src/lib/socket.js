import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (origin.includes("localhost")) return callback(null, true);
      if (origin.includes(".vercel.app")) return callback(null, true);
      if (origin === process.env.CLIENT_URL) return callback(null, true);

      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  },
});

// userId -> socketId mapping
const userSocketMap = {};

/**
 * Get the socket ID for a given userId.
 * Used by controllers (message, ledger) to emit targeted events.
 */
export function getReceiverSocketId(userId) {
  return userSocketMap[userId.toString()];
}

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // Broadcast updated online users list to everyone
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ─────────────────────────────────────────────
  // 💬 REAL-TIME MESSAGING
  // FIX: The backend now emits "newMessage" directly from the
  // message.controller via io.to(socketId).emit(...).
  // This socket relay is kept as a fallback only.
  // ─────────────────────────────────────────────
  socket.on("send-message", ({ to, message }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", message);
    }
  });

  // ─────────────────────────────────────────────
  // 📞 CALL SIGNALING
  // ─────────────────────────────────────────────
  socket.on("call-user", ({ to, from, callerName, roomId }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", { from, roomId, callerName });
    }
  });

  socket.on("accept-call", ({ to, roomId }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", { roomId });
    }
  });

  socket.on("decline-call", ({ to }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-declined");
    }
  });

  socket.on("cancel-call", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-cancelled");
    }
  });

  // ─────────────────────────────────────────────
  // 📹 WEBRTC ROOM
  // ─────────────────────────────────────────────
  socket.on("join-room", (roomId) => {
    if (socket.rooms.has(roomId)) return; // already joined

    const room = io.sockets.adapter.rooms.get(roomId);
    const currentSize = room ? room.size : 0;

    if (currentSize === 0) {
      socket.join(roomId);
      socket.emit("init");
    } else if (currentSize === 1) {
      socket.join(roomId);
      io.to(roomId).emit("ready");
    } else {
      socket.emit("room-full");
    }
  });

  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", { offer });
  });

  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  socket.on("peer-video-toggle", ({ roomId, isOff }) => {
    socket.to(roomId).emit("peer-video-toggle", { isOff });
  });

  socket.on("peer-audio-toggle", ({ roomId, isMuted }) => {
    socket.to(roomId).emit("peer-audio-toggle", { isMuted });
  });

  // ─────────────────────────────────────────────
  // DISCONNECT
  // ─────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    for (const user in userSocketMap) {
      if (userSocketMap[user] === socket.id) {
        delete userSocketMap[user];
        break;
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io };
