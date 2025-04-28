import express from 'express';
import { addToCart, updateCart, removeCartItem, getCart} from '../controller/cartController.js';

const router = express.Router();

router.route('/post').post(addToCart)
router.route('/update').patch(updateCart)
router.route('/remove').delete(removeCartItem)
router.route('/:userId').get(getCart)

export default router;