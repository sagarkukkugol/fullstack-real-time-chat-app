import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();

import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import ledgerRoutes from "./routes/ledger.route.js";
import contactRoutes from "./routes/contact.route.js";

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.set("trust proxy", 1);

/* ✅ FINAL CORS FIX (handles ALL Vercel URLs) */
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // allow localhost
      if (origin.includes("localhost")) {
        return callback(null, true);
      }

      // allow ALL vercel deployments (preview + production)
      if (origin.includes(".vercel.app")) {
        return callback(null, true);
      }

      // allow your CLIENT_URL if set
      if (origin === process.env.CLIENT_URL) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked for origin: " + origin));
    },
    credentials: true,
  })
);

/* ✅ HEALTH CHECK */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/contacts", contactRoutes);

/* START SERVER AFTER DB */
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("🚀 Server running on PORT: " + PORT);
    });
  })
  .catch((err) => {
    console.error("DB connection failed ❌", err);
  });