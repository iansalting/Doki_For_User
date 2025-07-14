import jwt from "jsonwebtoken";
import Config from "../config/config.js";
import User from "../model/userModel.js"; // ✅ Make sure this is added

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: "No token. Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, Config.accessTokenSecret);
    const user = await User.findById(decoded.id).select("-password"); 

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export { authMiddleware };
