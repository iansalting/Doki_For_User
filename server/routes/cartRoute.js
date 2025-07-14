import express from 'express';
import { addToCart, updateCart, removeCartItem, getCart} from '../controller/cartController.js';
import { authMiddleware } from '../middleware/authmidleware.js';

const router = express.Router();

router.route('/post').post(authMiddleware, addToCart) 
router.route('/update').put(authMiddleware,updateCart)
router.route('/remove').delete(authMiddleware,removeCartItem)
router.route('/items').get( authMiddleware,getCart)

export default router;