import express from 'express';
import { register, login, update, passwordReset, logout, getProfile, userVerifyEmail, resendVerification, getUserData } from "../controller/userController.js"
import { authMiddleware } from '../middleware/authmidleware.js';


const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/forget-password").post(update);
router.route("/reset-password/:token").post(passwordReset);
router.route("/logout").post(authMiddleware,logout); 
router.route("/profile").get(authMiddleware, getProfile);
router.route("/verifyEmail/:token").get(userVerifyEmail);
router.route("/resend-verification").post(resendVerification);
router.route("/data").get(authMiddleware, getUserData);


export default router;