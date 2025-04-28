import createHttpError from "http-errors";
import User from "../model/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Config from "../config/config.js";

const register = async (req, res, next) => {
  const { name, password, email } = req.body;

  try {
    if (!name || !password || !email)
      return next(createHttpError(400, "all fields are required"));
    const existingUser = await User.findOne({ email });
    if (existingUser) return next(createHttpError(400, "user already exists"));

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "user created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { password, email } = req.body;

    if (!password || !email) {
      return next(createHttpError(400, "all fields are required"));
    }
    const isUserPresent = await User.findOne({ email });
    if (!isUserPresent) {
      return next(createHttpError(400, "user not found"));
    }

    const isValidPassword = await bcrypt.compare(
      password,
      isUserPresent.password
    );
    if (!isValidPassword) {
      return next(createHttpError(400, "invalid password"));
    }

    const token = jwt.sign(
      { id: isUserPresent._id },
      Config.accessTokenSecret,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "none",
      secure: true,
    });

    res
      .status(200)
      .json({
        success: true,
        message: "login successful",
        data: isUserPresent,
      });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {

};

export { register, login, update };
