import createHttpError from "http-errors";
import User from "../model/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Config from "../config/config.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import path from "path";

const register = async (req, res, next) => {
  try {
    const { userName, password, email } = req.body;

    if (!userName || !password || !email) {
      return next(
        createHttpError(400, "Name, email, and password are required")
      );
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return next(createHttpError(400, "Please enter a valid email address"));
    }

    if (password.length < 6) {
      return next(
        createHttpError(400, "Password must be at least 6 characters long")
      );
    }

    let existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingUser) {
      return next(createHttpError(400, "Email already exists"));
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 3600000; // 1 hour

    const user = new User({
      userName: userName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isVerified: false, 
      verificationToken,
      verificationTokenExpiry: tokenExpiry,
    });

    await user.save();

    const verificationLink = `${Config.resetLink}/verify-email/${verificationToken}`;

    const emailContent = `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your email address</p>
      <a href="${verificationLink}" target="_blank">${verificationLink}</a>
      <p>This link will expire in 1 hour</p>
    `;

    await sendEmail(user.email, "Verify your Email", emailContent);

    const userResponse = {
      _id: user._id,
      name: user.userName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };

    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email for verification.",
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { password, email } = req.body;

    if (!password || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Wrong password, try again" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email before logging in" });
    }

    const token = jwt.sign({ id: user._id }, Config.accessTokenSecret, {
      expiresIn: "24h",
    });

    res.cookie("accessToken", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const userResponse = {
      _id: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const update = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(createHttpError(400, "Email is required"));
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();

    const resetLink = `${Config.resetLink}/reset-password/${resetToken}`;

    const emailContent = `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>This link will expire in 1 hour</p>
    `;

    await sendEmail(user.email, "Password Reset Request", emailContent);

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    next(error);
  }
};

const passwordReset = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return next(createHttpError(400, "Password is required"));
    }

    if (password.length < 6) {
      return next(
        createHttpError(400, "Password must be at least 6 characters long")
      );
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(createHttpError(400, "Invalid or expired token"));
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path:"/"
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

const userVerifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    console.log("Token received:", token);

    const user = await User.findOne({ verificationToken: token });
    console.log("Token received:", token);
    console.log("User found:", user); 

    if (!user) {
      return next(createHttpError(400, "Invalid verification token"));
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return next(createHttpError(401, "Unauthorized"));
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        cart: user.cart,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(createHttpError(400, "Email is required"));
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return next(createHttpError(400, "User not found"));
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 3600000; // 1 hour

    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = tokenExpiry;
    await user.save();

    const verificationLink = `${Config.resetLink}/verify-email/${verificationToken}`;

    const emailContent = `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your email address</p>
      <a href="${verificationLink}" target="_blank">${verificationLink}</a>
      <p>This link will expire in 1 hour</p>
    `;

    await sendEmail(user.email, "Verify your Email", emailContent);

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getUserData = async (req, res, next) => {
  try {
    const user = req.user; 

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};



export {
  register,
  login,
  update,
  passwordReset,
  logout,
  getProfile,
  userVerifyEmail,
  resendVerification,
  getUserData
};
