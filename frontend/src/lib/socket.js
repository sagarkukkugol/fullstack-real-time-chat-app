import { io } from "socket.io-client";

let socket = null;

export const connectSocket = () => {
  if (socket && socket.connected) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const token = localStorage.getItem("token");

  // ✅ CONNECT TO BACKEND URL
  socket = io(import.meta.env.VITE_API_URL, {
    auth: {
      token, // ✅ send token instead of query
    },
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