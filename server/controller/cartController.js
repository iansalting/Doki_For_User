import User from '../model/userModel.js'
import mongoose from 'mongoose'
import Menu from '../model/menuModel.js'

const addToCart = async (req, res, next) => {
    try {
        const { userId, quantity = 1, menuItemId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(menuItemId)) {
            return res.status(400).json({ message: 'Invalid user or menu item id' });
        }

        const menuItem = await Menu.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        if (!menuItem.available) {
            return res.status(404).json({ message: 'Menu item not available' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.cart) {
            user.cart = [];
        }

        const existingCartItem = user.cart.find(item => item.productId?.toString() === menuItemId);

        if (existingCartItem) {
            existingCartItem.quantity += quantity;
        } else {
            user.cart.push({ productId: menuItemId, quantity });
        }

        await user.save();

        return res.status(200).json({ success: true, message: 'Item added to cart', cart: user.cart });
    } catch (error) {
        next(error);
    }
};


const updateCart = async (req, res, next) => {
    try {
        const { userId, menuItemId, quantity } = req.body;
        if(!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(menuItemId)){
            return res.status(400).json({ message: 'Invalid user or menu item id' });
        }

        const user = await User.findById(userId);
        if (!user) { return res.status(404).json({ message: 'User not found'})}
        const existingCartItem = user.cart.findIndex(item => item.productId?.toString() === menuItemId);
        if (existingCartItem === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        if (quantity <= 0) {
            user.cart.splice(existingCartItem, 1);
        } else {
            user.cart[existingCartItem].quantity = quantity;
        }

        await user.save();

        return res.status(200).json({ success:true, message: 'Cart updated', cart: user.cart });
    } catch (error) {
        next(error)
    }
}

const removeCartItem = async (req, res, next) => {
    try {
        const { userId, menuItemId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(menuItemId)) {
            return res.status(400).json({ message: 'Invalid user or menu item id' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.cart = user.cart.filter(item => item.productId?.toString() !== menuItemId);

        await user.save();

        return res.status(200).json({ success: true, message: 'Item removed from cart', cart: user.cart });
    } catch (error) {
        next(error);
    }
};


const getCart = async (req, res, next) => {
    try {
      const { userId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user id' });
      }
  
      const user = await User.findById(userId).populate('cart.productId');
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      return res.status(200).json({
        success: true,
        cart: user.cart
      });
    } catch (error) {
      next(error);
    }
};
  

export {addToCart, updateCart, removeCartItem, getCart};