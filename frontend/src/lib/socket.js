import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (userId) => {
  // BUG FIX #4: If socket exists but is disconnected (after logout), destroy it
  // so we create a fresh one with the correct userId
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.removeAllListeners();
    socket = null;
  }

  socket = io(import.meta.env.VITE_API_URL
, {
    query: { userId },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("✅ SOCKET CONNECTED:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("❌ SOCKET DISCONNECTED");
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};