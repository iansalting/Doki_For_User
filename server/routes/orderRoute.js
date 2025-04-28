import express from "express"
const router = express.Router();
import { addOrder } from "../controller/ordercontroller.js";

router.route('/dashboard').post(addOrder)  

export default router;