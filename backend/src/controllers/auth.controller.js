import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// CHANGED: now requires phoneNumber in addition to existing fields.
// ─────────────────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
  const { fullName, email, password, phoneNumber } = req.body;

  try {
    // ── Required field check ─────────────────────
    if (!fullName || !email || !password || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // ── Phone number format validation ───────────
    // Accepts 10-15 digits, optional leading +
    if (!/^\+?[0-9]{10,15}$/.test(phoneNumber.trim())) {
      return res.status(400).json({
        message: "Phone number must be 10–15 digits (e.g. 9876543210 or +919876543210)",
      });
    }

    // ── Duplicate checks ─────────────────────────
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const existingPhone = await User.findOne({ phoneNumber: phoneNumber.trim() });
    if (existingPhone) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    // ── Hash password ────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber: phoneNumber.trim(),
    });

    generateToken(newUser._id, res);
    await newUser.save();

    // Return safe user object (never expose password)
    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.error("signup error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login  (UNCHANGED — kept for completeness)
// ─────────────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("login error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  (UNCHANGED)
// ─────────────────────────────────────────────────────────────────────────────
export const logout = (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("jwt", "", {
      maxAge: 0,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("logout error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/update-profile
// CHANGED: now updates fullName + phoneNumber + profilePic.
// Email and password are intentionally excluded — they cannot be changed here.
// ─────────────────────────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName, phoneNumber } = req.body;
    const userId = req.user._id;

    const updates = {};

    // ── Profile picture ──────────────────────────
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updates.profilePic = uploadResponse.secure_url;
    }

    // ── Full name ────────────────────────────────
    if (fullName !== undefined) {
      const trimmed = fullName.trim();
      if (!trimmed) {
        return res.status(400).json({ message: "Full name cannot be empty" });
      }
      updates.fullName = trimmed;
    }

    // ── Phone number ─────────────────────────────
    if (phoneNumber !== undefined) {
      const trimmed = phoneNumber.trim();
      if (!/^\+?[0-9]{10,15}$/.test(trimmed)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }
      // Check uniqueness (exclude current user)
      const conflict = await User.findOne({ phoneNumber: trimmed, _id: { $ne: userId } });
      if (conflict) {
        return res.status(400).json({ message: "Phone number already in use" });
      }
      updates.phoneNumber = trimmed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select(
      "-password"
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/check  (UNCHANGED)
// ─────────────────────────────────────────────────────────────────────────────
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("checkAuth error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
