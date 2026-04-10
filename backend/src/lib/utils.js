
import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    httpOnly: true,                                  // ✅ JS cannot read cookie
    secure: isProduction,                            // ✅ HTTPS only in production
    sameSite: isProduction ? "none" : "lax",         // ✅ "none" required for cross-site (Vercel → Render)
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};