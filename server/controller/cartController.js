import User from '../model/userModel.js'
import mongoose from 'mongoose'
import Menu from '../model/menuModel.js'

const addToCart = async (req, res, next) => {
    try {
        const { quantity = 1, menuItemId } = req.body;
        const userId = req.user._id;

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
        const { quantity, menuItemId } = req.body;
        const userId = req.user._id; // Using auth middleware user

        // Validate inputs
        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
            return res.status(400).json({ message: 'Invalid menu item id' });
        }

        // Check if menu item exists and is available
        const menuItem = await Menu.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        if (!menuItem.available) {
            return res.status(400).json({ message: 'Menu item not available' });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if cart exists
        if (!user.cart || user.cart.length === 0) {
            return res.status(404).json({ message: 'Cart is empty' });
        }

        // Find the cart item to update
        const cartItemIndex = user.cart.findIndex(item => item.productId?.toString() === menuItemId);
        if (cartItemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        // Update quantity
        user.cart[cartItemIndex].quantity = quantity;

        await user.save();

        return res.status(200).json({ 
            success: true, 
            message: 'Cart item updated successfully', 
            cart: user.cart 
        });
    } catch (error) {
        next(error);
    }
};

const removeCartItem = async (req, res, next) => {
    try {
        const { menuItemId } = req.body;
        const userId = req.user._id; // Using auth middleware user

        if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
            return res.status(400).json({ message: 'Invalid menu item id' });
        }


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

   
        if (!user.cart || user.cart.length === 0) {
            return res.status(404).json({ message: 'Cart is empty' });
        }


        const cartItemIndex = user.cart.findIndex(item => item.productId?.toString() === menuItemId);
        if (cartItemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }


        user.cart.splice(cartItemIndex, 1);

        await user.save();

        return res.status(200).json({ 
            success: true, 
            message: 'Item removed from cart successfully', 
            cart: user.cart 
        });
    } catch (error) {
        next(error);
    }
};

const getCart = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).populate("cart.productId");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            cart: user.cart
        });
    } catch (error) {
        next(error);
    }
};

export { addToCart, updateCart, removeCartItem, getCart };