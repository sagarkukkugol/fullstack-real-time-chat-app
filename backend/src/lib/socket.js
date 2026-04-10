import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// ✅ CORS FIX (VERY IMPORTANT)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // allow localhost
      if (origin.includes("localhost")) return callback(null, true);

      // allow ALL vercel deployments (preview + prod)
      if (origin.includes(".vercel.app")) return callback(null, true);

      // allow production frontend
      if (origin === process.env.CLIENT_URL) return callback(null, true);

      return callback(new Error("❌ CORS blocked: " + origin));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// userId -> socketId mapping
const userSocketMap = {};

// ✅ EXPORT THIS (FIX YOUR PREVIOUS ERROR)
export function getReceiverSocketId(userId) {
  return userSocketMap[userId?.toString()];
}

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // broadcast online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // 💬 MESSAGE
  socket.on("send-message", ({ to, message }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", message);
    }
  });

  // 📞 CALL
  socket.on("call-user", ({ to, from, callerName, roomId }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", {
        from,
        roomId,
        callerName,
      });
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

  // 📹 WEBRTC ROOM
  socket.on("join-room", (roomId) => {
    if (socket.rooms.has(roomId)) return;

    const room = io.sockets.adapter.rooms.get(roomId);
    const size = room ? room.size : 0;

    if (size === 0) {
      socket.join(roomId);
      socket.emit("init");
    } else if (size === 1) {
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

  // ❌ DISCONNECT
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

// ✅ IMPORTANT EXPORT (YOU WERE MISSING THIS BEFORE)
export { app, server, io };