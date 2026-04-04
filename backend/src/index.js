import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fileUpload from "express-fileupload";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

// ✅ IMPORTANT: using existing socket setup
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

// ✅ FILE UPLOAD
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// ✅ DEBUG ENV
console.log("ENV CHECK:", process.env.MONGO_URI);

// ✅ BODY LIMIT (for images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ✅ COOKIE PARSER
app.use(cookieParser());

// ✅ CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ✅ ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ✅ PRODUCTION BUILD
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// ✅ START SERVER (ONLY ONE SERVER)
server.listen(PORT, () => {
  console.log("Server running on PORT:", PORT);
  connectDB();
});