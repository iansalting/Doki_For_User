import express from "express"
const router = express.Router();
import { addOrder } from "../controller/orderController.js";
import { authMiddleware } from "../middleware/authmidleware.js";


router.route('/dashboard').post(authMiddleware,addOrder)  

export default router;