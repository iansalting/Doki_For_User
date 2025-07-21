import User from "../model/userModel.js";
import mongoose from "mongoose";
import Menu from "../model/menuModel.js";

const addToCart = async (req, res, next) => {
  try {
    const { menuItemId, selectedSize } = req.body;
    const userId = req.user._id;
    const quantity = 1; // Always add 1 by default

    // Validate IDs
    if (
      !menuItemId ||
      !mongoose.Types.ObjectId.isValid(menuItemId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user or menu item ID" });
    }

    // Fetch menu item with populated sizes
    const menuItem = await Menu.findById(menuItemId);
    if (!menuItem)
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found" });
    if (!menuItem.available)
      return res
        .status(400)
        .json({ success: false, message: "Menu item is not available" });

    // Determine the correct size to use
    let finalSelectedSize;
    let sizeObject;

    if (menuItem.category === "ramen") {
      // For ramen items, selectedSize is required
      if (!selectedSize) {
        return res.status(400).json({
          success: false,
          message: "Size selection is required for ramen items",
        });
      }

      // Find the size object (selectedSize could be either ID or label)
      sizeObject = menuItem.sizes.find(
        (size) =>
          size._id.toString() === selectedSize || size.label === selectedSize
      );

      if (!sizeObject) {
        return res.status(400).json({
          success: false,
          message: "Selected size is not available for this ramen item",
        });
      }

      finalSelectedSize = sizeObject.label; // Store the label for consistency
    } else {
      // For non-ramen items, automatically use Classic size
      sizeObject = menuItem.sizes.find((size) => size.label === "Classic");

      if (!sizeObject) {
        return res.status(400).json({
          success: false,
          message: "Classic size not found for this item",
        });
      }

      finalSelectedSize = "Classic";

      // If a size was provided, validate it matches Classic
      if (
        selectedSize &&
        selectedSize !== "Classic" &&
        selectedSize !== sizeObject._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Only Classic size is available for non-ramen items",
        });
      }
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Initialize cart if it doesn't exist
    if (!user.cart) user.cart = [];

    // Check if this exact item+size combination already exists in cart
    const existingItem = user.cart.find(
      (item) =>
        item.productId.toString() === menuItemId &&
        item.selectedSize === finalSelectedSize
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cart.push({
        productId: menuItemId,
        selectedSize: finalSelectedSize,
        quantity,
        // Optionally store additional info for easier frontend handling
        price: sizeObject.price,
        sizeId: sizeObject._id,
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Item added to cart successfully (${finalSelectedSize} size)`,
      cart: user.cart,
      addedItem: {
        productId: menuItemId,
        selectedSize: finalSelectedSize,
        price: sizeObject.price,
        quantity: existingItem ? existingItem.quantity : quantity,
      },
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    next(error);
  }
};

const updateCart = async (req, res, next) => {
  try {
    const { quantity, menuItemId, selectedSize } = req.body;
    const userId = req.user._id;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return res.status(400).json({ message: "Invalid menu item ID" });
    }

    if (!selectedSize || typeof selectedSize !== "string") {
      return res.status(400).json({ message: "Selected size is required" });
    }

    const menuItem = await Menu.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    if (!menuItem.available) {
      return res.status(400).json({ message: "Menu item not available" });
    }

    // Check if the selected size exists
    const sizeExists = menuItem.sizes.some(
      (size) => size.label === selectedSize
    );
    if (!sizeExists) {
      return res
        .status(400)
        .json({ message: "Selected size does not exist for this menu item" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if cart exists
    if (!user.cart || user.cart.length === 0) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    // Find the cart item to update
    const cartItemIndex = user.cart.findIndex(
      (item) =>
        item.productId?.toString() === menuItemId &&
        item.selectedSize === selectedSize
    );

    if (cartItemIndex === -1) {
      return res
        .status(404)
        .json({ message: "Item not found in cart with selected size" });
    }

    // Update quantity
    user.cart[cartItemIndex].quantity = quantity;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      cart: user.cart,
    });
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const { menuItemId, selectedSize } = req.body; // Add selectedSize
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return res.status(400).json({ message: "Invalid menu item id" });
    }

    // selectedSize is required to identify the exact cart item
    if (!selectedSize) {
      return res.status(400).json({ message: "Selected size is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.cart || user.cart.length === 0) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    // Find cart item by both menuItemId AND selectedSize
    const cartItemIndex = user.cart.findIndex(
      (item) =>
        item.productId?.toString() === menuItemId &&
        item.selectedSize === selectedSize
    );

    if (cartItemIndex === -1) {
      return res
        .status(404)
        .json({ message: "Item with selected size not found in cart" });
    }

    user.cart.splice(cartItemIndex, 1);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      cart: user.cart,
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

    // Process cart items and calculate totals
    const processedCart = [];
    let grandTotal = 0;
    let totalItems = 0;

    // Group items by menu item ID for easier processing
    const itemGroups = {};

    user.cart.forEach((item) => {
      if (!item.productId) return; // Skip if product was deleted

      const menuItemId = item.productId._id.toString();
      const selectedSize = item.productId.sizes.find(
        (size) => size.label === item.selectedSize
      );

      if (!selectedSize) return; // Skip if size not found

      const key = `${menuItemId}_${item.selectedSize}`;

      if (!itemGroups[key]) {
        itemGroups[key] = [];
      }

      itemGroups[key].push({
        cartItemId: item._id,
        quantity: item.quantity,
        selectedSize,
        productId: item.productId,
      });
    });

    // Process each group
    Object.values(itemGroups).forEach((group) => {
      // Sum up quantities for same item+size combination
      const totalQuantity = group.reduce((sum, item) => sum + item.quantity, 0);
      const firstItem = group[0];
      const itemTotal = firstItem.selectedSize.price * totalQuantity;

      processedCart.push({
        _id: firstItem.cartItemId,
        quantity: totalQuantity,
        selectedSize: firstItem.selectedSize.label,
        itemTotal: parseFloat(itemTotal.toFixed(2)),
        unitPrice: firstItem.selectedSize.price,
        productId: {
          _id: firstItem.productId._id,
          name: firstItem.productId.name,
          description: firstItem.productId.description,
          category: firstItem.productId.category,
          available: firstItem.productId.available,
          size: {
            _id: firstItem.selectedSize._id,
            label: firstItem.selectedSize.label,
            price: firstItem.selectedSize.price,
            ingredients: firstItem.selectedSize.ingredients || [],
          },
        },
        // Additional cart item IDs if multiple entries exist for same item+size
        cartItemIds: group.map((item) => item.cartItemId),
      });

      grandTotal += itemTotal;
      totalItems += totalQuantity;
    });

    // Sort cart by category and name for better organization
    processedCart.sort((a, b) => {
      if (a.productId.category !== b.productId.category) {
        return a.productId.category.localeCompare(b.productId.category);
      }
      return a.productId.name.localeCompare(b.productId.name);
    });

    // Group by category for organized display
    const categorizedCart = {};
    processedCart.forEach((item) => {
      const category = item.productId.category;
      if (!categorizedCart[category]) {
        categorizedCart[category] = {
          items: [],
          categoryTotal: 0,
          itemCount: 0,
        };
      }
      categorizedCart[category].items.push(item);
      categorizedCart[category].categoryTotal += item.itemTotal;
      categorizedCart[category].itemCount += item.quantity;
    });

    // Calculate summary by category
    const categorySummary = Object.entries(categorizedCart).map(
      ([category, data]) => ({
        category,
        itemCount: data.itemCount,
        total: parseFloat(data.categoryTotal.toFixed(2)),
      })
    );

    return res.status(200).json({
      success: true,
      cart: processedCart,
      categorizedCart,
      summary: {
        totalItems,
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        categories: categorySummary,
        isEmpty: processedCart.length === 0,
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    next(error);
  }
};

export { addToCart, updateCart, removeCartItem, getCart };
