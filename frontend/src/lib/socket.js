import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (userId) => {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.removeAllListeners();
    socket = null;
  }

  // ✅ FIX #4: Socket.IO connects to the BASE URL (no /api suffix).
  // VITE_API_URL is now the bare base URL, so this is correct.
  socket = io("/", {
  query: { userId },
  withCredentials: true,
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
