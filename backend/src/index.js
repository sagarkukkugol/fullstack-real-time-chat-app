import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import ledgerRoutes from "./routes/ledger.route.js";
import contactRoutes from "./routes/contact.route.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

/* ✅ FIXED CORS (IMPORTANT) */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "fullstack-real-time-chat-app-7cag.vercel.app",
      process.env.CLIENT_URL, // your Vercel URL
    ],
    credentials: true,
  })
);

/* ✅ HEALTH CHECK */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

/* ✅ ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/contacts", contactRoutes);

/* ✅ START SERVER AFTER DB */
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on PORT: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed ❌", err);
  });