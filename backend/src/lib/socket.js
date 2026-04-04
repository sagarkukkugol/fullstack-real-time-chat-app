import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// userId -> socketId
const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // =========================
  // REALTIME MESSAGE
  // =========================
  socket.on("send-message", ({ to, message }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", message);
    }
  });

  // =========================
  // 📞 CALL FLOW
  // =========================

  // Caller → Receiver: incoming call notification
  socket.on("call-user", ({ to, from, callerName, roomId }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", { from, roomId, callerName });
    }
  });

  // Receiver accepts → notify caller
  socket.on("accept-call", ({ to, roomId }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", { roomId });
    }
  });

  // Receiver declines → notify caller
  socket.on("decline-call", ({ to }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-declined");
    }
  });

  // Caller cancels before receiver picks up → notify receiver
  socket.on("cancel-call", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-cancelled");
    }
  });

  // Relay camera state to other peer in room
  socket.on("peer-video-toggle", ({ roomId, isOff }) => {
    socket.to(roomId).emit("peer-video-toggle", { isOff });
  });

  // Relay mic state to other peer in room
  socket.on("peer-audio-toggle", ({ roomId, isMuted }) => {
    socket.to(roomId).emit("peer-audio-toggle", { isMuted });
  });

  // =========================
  // 📹 WEBRTC ROOM
  // =========================
  socket.on("join-room", (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);

    // If socket is already in this room (e.g. navigated back), ignore
    if (socket.rooms.has(roomId)) {
      return;
    }

    // Count members excluding this socket
    const currentSize = room ? room.size : 0;

    if (currentSize === 0) {
      // First person — they wait as initiator
      socket.join(roomId);
      socket.emit("init");
    } else if (currentSize === 1) {
      // Second person joins — start the call
      socket.join(roomId);
      io.to(roomId).emit("ready");
    } else {
      // Room already has 2 people
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

  // =========================
  // DISCONNECT
  // =========================
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

export { app, server };
