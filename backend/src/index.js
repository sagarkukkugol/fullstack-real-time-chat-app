import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import userRoutes from "./routes/user.route.js";

dotenv.config();

const app = express();

// ✅ MIDDLEWARE
app.use(express.json());
app.use(cookieParser());

// 🔥 CORS FIX (MOST IMPORTANT)
app.use(
  cors({
    origin: "https://fullstack-real-time-chat-app-eta.vercel.app",
    credentials: true,
  })
);

// ✅ ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});