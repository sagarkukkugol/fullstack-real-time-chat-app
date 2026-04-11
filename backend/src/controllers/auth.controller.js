import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// ─────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────
export const signup = async (req, res) => {
  const { fullName, email, password, phoneNumber } = req.body;

  try {
    if (!fullName || !email || !password || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
    });

    // ✅ GENERATE TOKEN
    const token = generateToken(newUser._id);

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        profilePic: newUser.profilePic,
      },
    });

  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ✅ GENERATE TOKEN
    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePic: user.profilePic,
      },
    });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─────────────────────────────────────────
// LOGOUT (FRONTEND HANDLES IT)
// ─────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName, phoneNumber } = req.body;
    const userId = req.user._id;

    const updates = {};

    if (profilePic) {
      const upload = await cloudinary.uploader.upload(profilePic);
      updates.profilePic = upload.secure_url;
    }

    if (fullName) updates.fullName = fullName;
    if (phoneNumber) updates.phoneNumber = phoneNumber;

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select("-password");

    res.status(200).json(updatedUser);

  } catch (error) {
    console.error("Update error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─────────────────────────────────────────
// CHECK AUTH
// ─────────────────────────────────────────
export const checkAuth = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};