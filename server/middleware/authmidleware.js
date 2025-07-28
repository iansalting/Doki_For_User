import jwt from "jsonwebtoken";
import Config from "../config/config.js";
import User from "../model/userModel.js";

const authMiddleware = async (req, res, next) => {
  // Debug logs
  console.log("🍪 All cookies:", req.cookies);
  console.log("🎯 AccessToken cookie:", req.cookies.accessToken);
  console.log("📝 Headers:", req.headers.cookie);
  
  const token = req.cookies.accessToken;

  if (!token) {
    console.log("❌ No token found in cookies");
    return res.status(401).json({ message: "No token. Unauthorized" });
  }

  try {
    console.log("🔍 Token found:", token.substring(0, 20) + "...");
    const decoded = jwt.verify(token, Config.accessTokenSecret);
    console.log("✅ Token decoded successfully:", decoded);
    
    const user = await User.findById(decoded.id).select("-password"); 

    if (!user) {
      console.log("❌ User not found for ID:", decoded.id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ User found:", user.userName);
    req.user = user;
    next();
  } catch (err) {
    console.log("❌ Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export { authMiddleware };