import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import ledgerRoutes from "./routes/ledger.route.js";
import contactRoutes from "./routes/contact.route.js";

const PORT = process.env.PORT || 5000;

// ✅ BODY PARSER
app.use(express.json({ limit: "10mb" }));

// ✅ TRUST PROXY (Render)
app.set("trust proxy", 1);

// ✅ SIMPLE CORS (WORKS WITH JWT)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ✅ ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/contacts", contactRoutes);

// ✅ START SERVER
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("🚀 Server running on PORT:", PORT);
    });
  })
  .catch((err) => {
    console.error("DB connection failed ❌", err);
  });