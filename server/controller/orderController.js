import Stripe from "stripe";
import Ingredient from "../model/ingredientModel.js";
import Order from "../model/orderModel.js";
import User from "../model/userModel.js";
import Menu from "../model/menuModel.js"; // Import Menu model
import { getIO } from "../socket.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const addOrder = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { paymentMethodId } = req.body;

    console.log("Processing order for user:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment method ID is required" 
      });
    }

    // First, get user without population to check if cart exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Cart is empty" 
      });
    }

    console.log("Raw cart before population:", user.cart);

    // Manually populate cart items with better error handling
    const populatedCartItems = [];
    
    for (const cartItem of user.cart) {
      try {
        const menuItem = await Menu.findById(cartItem.productId).populate({
          path: "sizes.ingredients.ingredient",
          model: "Ingredient"
        });

        if (!menuItem) {
          console.warn(`Menu item ${cartItem.productId} not found - skipping`);
          continue; // Skip this item instead of failing the entire order
        }

        // Create a populated cart item
        populatedCartItems.push({
          _id: cartItem._id,
          productId: menuItem,
          selectedSize: cartItem.selectedSize,
          quantity: cartItem.quantity,
          price: cartItem.price,
          sizeId: cartItem.sizeId
        });
      } catch (popError) {
        console.error(`Error populating cart item ${cartItem.productId}:`, popError);
        continue; // Skip this item
      }
    }

    if (populatedCartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid items found in cart. Some items may have been removed."
      });
    }

    console.log("Populated cart items:", populatedCartItems.length);

    const orderItems = [];
    let subtotal = 0;
    const ingredientUpdates = {};

    // Process each cart item
    for (const cartItem of populatedCartItems) {
      const menuItem = cartItem.productId; // This is now the populated menu item

      if (!menuItem.available) {
        return res.status(400).json({
          success: false,
          message: `Menu item "${menuItem.name}" is no longer available`
        });
      }

      // Enhanced size handling with fallbacks
      let selectedSize = cartItem.selectedSize;
      let itemPrice = 0;
      let ingredientsToUpdate = [];
      let sizeObject = null;

      // For ramen items or items with multiple sizes
      if (menuItem.sizes && menuItem.sizes.length > 0) {
        // If no size specified, default based on category
        if (!selectedSize) {
          selectedSize = menuItem.category === 'ramen' ? 'Classic' : 'Classic';
        }

        sizeObject = menuItem.sizes.find(size => size.label === selectedSize);
        
        if (!sizeObject) {
          // Fallback to first available size
          sizeObject = menuItem.sizes[0];
          selectedSize = sizeObject.label;
          console.warn(`Size "${cartItem.selectedSize}" not found for "${menuItem.name}", using "${selectedSize}"`);
        }

        itemPrice = sizeObject.price;
        ingredientsToUpdate = sizeObject.ingredients || [];
      } else {
        // For items without sizes (shouldn't happen with your new system, but safety fallback)
        selectedSize = 'Classic';
        itemPrice = cartItem.price || menuItem.basePrice || menuItem.price || 0;
        ingredientsToUpdate = menuItem.ingredients || [];
      }

      if (itemPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for menu item "${menuItem.name}" (${selectedSize})`
        });
      }

      // Validate quantity
      if (!cartItem.quantity || cartItem.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for menu item "${menuItem.name}"`
        });
      }

      // Check if the specific size is available (ingredient check)
      if (sizeObject && sizeObject.ingredients && sizeObject.ingredients.length > 0) {
        for (const ingredientUsage of sizeObject.ingredients) {
          const ingredient = ingredientUsage.ingredient;
          if (!ingredient) continue;

          const requiredPerItem = ingredientUsage.quantity || 1;
          const totalRequired = requiredPerItem * cartItem.quantity;
          const available = ingredient.stockQuantity !== undefined 
            ? ingredient.stockQuantity 
            : ingredient.quantity || 0;

          if (available < totalRequired) {
            return res.status(400).json({
              success: false,
              message: `Insufficient "${ingredient.name}" for ${cartItem.quantity}x ${menuItem.name} (${selectedSize}). Required: ${totalRequired} ${ingredient.unit || 'units'}, Available: ${available} ${ingredient.unit || 'units'}`
            });
          }
        }
      }

      // Create order item
      const orderItem = {
        menuItem: menuItem._id,
        selectedSize: selectedSize,
        quantity: cartItem.quantity,
        price: itemPrice * cartItem.quantity, // Total price for this item
      };

      orderItems.push(orderItem);
      subtotal += itemPrice * cartItem.quantity;

      console.log(`Processing ${menuItem.name} (${selectedSize}): ${cartItem.quantity} x ₱${itemPrice} = ₱${itemPrice * cartItem.quantity}`);

      // Calculate ingredient usage for batch update
      if (ingredientsToUpdate.length > 0) {
        for (const ingredientUsage of ingredientsToUpdate) {
          if (!ingredientUsage.ingredient || !ingredientUsage.ingredient._id) {
            console.warn(`Missing ingredient data for ${menuItem.name} (${selectedSize})`);
            continue;
          }

          const ingredientId = ingredientUsage.ingredient._id.toString();
          const requiredAmount = (ingredientUsage.quantity || 1) * cartItem.quantity;

          if (!ingredientUpdates[ingredientId]) {
            ingredientUpdates[ingredientId] = {
              ingredient: ingredientUsage.ingredient,
              totalRequired: 0,
              usages: [] // Track which items use this ingredient
            };
          }

          ingredientUpdates[ingredientId].totalRequired += requiredAmount;
          ingredientUpdates[ingredientId].usages.push({
            menuItem: menuItem.name,
            size: selectedSize,
            quantity: cartItem.quantity,
            requiredAmount
          });
        }
      }
    }

    console.log("Order subtotal:", subtotal);
    console.log("Ingredients to update:", Object.keys(ingredientUpdates).length);

    // Final ingredient availability check (double-check before payment)
    for (const [ingredientId, updateInfo] of Object.entries(ingredientUpdates)) {
      const ingredient = updateInfo.ingredient;
      const requiredAmount = updateInfo.totalRequired;
      
      // Get fresh ingredient data to avoid race conditions
      const freshIngredient = await Ingredient.findById(ingredientId);
      if (!freshIngredient) {
        return res.status(400).json({
          success: false,
          message: `Ingredient "${ingredient.name}" not found in database`
        });
      }

      const availableQuantity = freshIngredient.stockQuantity !== undefined 
        ? freshIngredient.stockQuantity 
        : freshIngredient.quantity || 0;

      if (availableQuantity < requiredAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${ingredient.name}". Required: ${requiredAmount} ${ingredient.unit || 'units'}, Available: ${availableQuantity} ${ingredient.unit || 'units'}. Used by: ${updateInfo.usages.map(u => `${u.quantity}x ${u.menuItem} (${u.size})`).join(', ')}`
        });
      }
    }

    // Simple manual tax calculation
    const taxRate = 0.08; // 8% tax
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    const totalWithTax = parseFloat((subtotal + taxAmount).toFixed(2));

    // Check minimum order amount
    const minimumOrderAmount = 30.00;
    if (totalWithTax < minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₱${minimumOrderAmount.toFixed(2)}. Current total: ₱${totalWithTax.toFixed(2)}. Please add more items to your order.`
      });
    }

    const amountInCents = Math.round(totalWithTax * 100);
    console.log("Payment amount:", totalWithTax, "PHP (", amountInCents, "centavos)");

    // Process Stripe payment
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "php",
        payment_method: paymentMethodId,
        confirm: true,
        description: `Order for ${user.userName || user.email} - ${orderItems.length} items`,
        metadata: {
          userId: userId.toString(),
          userName: user.userName,
          itemCount: orderItems.length.toString(),
          orderType: "cashless_order",
          subtotal: subtotal.toString(),
          tax: taxAmount.toString()
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
      });
    } catch (stripeError) {
      console.error("Stripe payment error:", stripeError);
      return res.status(400).json({
        success: false,
        message: `Payment failed: ${stripeError.message}`,
        stripeErrorCode: stripeError.code
      });
    }

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: `Payment failed with status: ${paymentIntent.status}`,
        paymentStatus: paymentIntent.status,
        paymentIntent: paymentIntent
      });
    }

    console.log("Payment successful:", paymentIntent.id);

    // Create order with simplified structure
    const newOrder = new Order({
      users: userId,
      customerName: user.userName, // Add customer name
      status: "pending",
      items: orderItems,
      bills: {
        total: subtotal,
        tax: taxAmount,
        totalWithTax: totalWithTax
      },
      payment: "cashless", // Always cashless for online orders
      paymentDetails: {
        paymentIntentId: paymentIntent.id,
        paymentMethodId: paymentMethodId,
        stripeCustomerId: paymentIntent.customer || null,
        paymentStatus: "succeeded",
        paymentTimestamp: new Date()
      },
    });

    const savedOrder = await newOrder.save();
    console.log("Order saved:", savedOrder._id);

    // Update ingredient quantities in batch
    const ingredientUpdatePromises = Object.entries(ingredientUpdates).map(
      async ([ingredientId, updateInfo]) => {
        const requiredAmount = updateInfo.totalRequired;
        
        try {
          // Use atomic update to prevent race conditions
          const updatedIngredient = await Ingredient.findOneAndUpdate(
            { 
              _id: ingredientId,
              $or: [
                { stockQuantity: { $gte: requiredAmount } },
                { quantity: { $gte: requiredAmount } }
              ]
            },
            [
              {
                $set: {
                  stockQuantity: {
                    $cond: {
                      if: { $ne: ["$stockQuantity", null] },
                      then: { $subtract: ["$stockQuantity", requiredAmount] },
                      else: "$stockQuantity"
                    }
                  },
                  quantity: {
                    $cond: {
                      if: { $eq: ["$stockQuantity", null] },
                      then: { $subtract: ["$quantity", requiredAmount] },
                      else: "$quantity"
                    }
                  }
                }
              }
            ],
            { new: true }
          );

          if (!updatedIngredient) {
            throw new Error(`Failed to update ingredient ${updateInfo.ingredient.name} - insufficient stock during update`);
          }

          const remainingStock = updatedIngredient.stockQuantity !== undefined 
            ? updatedIngredient.stockQuantity 
            : updatedIngredient.quantity;

          console.log(`Updated ${updatedIngredient.name}: ${remainingStock} ${updatedIngredient.unit || 'units'} remaining`);
          return updatedIngredient;
        } catch (updateError) {
          console.error(`Failed to update ingredient ${ingredientId}:`, updateError);
          throw updateError;
        }
      }
    );

    await Promise.all(ingredientUpdatePromises);

    // Emit socket event for real-time updates
    try {
      getIO().emit("new-order", {
        orderId: savedOrder._id,
        userId: userId,
        customerName: user.userName,
        status: savedOrder.status,
        total: totalWithTax,
        itemCount: orderItems.length,
        items: orderItems.map((item, index) => ({
          name: populatedCartItems[index]?.productId?.name || 'Unknown Item',
          size: item.selectedSize,
          quantity: item.quantity
        })),
        timestamp: new Date()
      });
    } catch (socketError) {
      console.warn("Socket emission failed:", socketError.message);
    }

    // Clear user cart
    user.cart = [];
    await user.save();
    console.log("Cart cleared for user:", userId);

    // Populate the saved order for response
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate({
        path: "items.menuItem",
        select: "name description category"
      })
      .populate({
        path: "users",
        model: "user", // Use lowercase "user" to match your User model registration
        select: "userName email"
      });

    return res.status(201).json({
      success: true,
      message: "Order placed and payment processed successfully",
      order: {
        _id: populatedOrder._id,
        orderNumber: populatedOrder._id.toString().slice(-8).toUpperCase(),
        customerName: populatedOrder.customerName,
        status: populatedOrder.status,
        items: populatedOrder.items.map((item, index) => ({
          name: item.menuItem?.name || populatedCartItems[index]?.productId?.name || 'Unknown Item',
          selectedSize: item.selectedSize,
          quantity: item.quantity,
          price: item.price,
          unitPrice: item.price / item.quantity
        })),
        bills: populatedOrder.bills,
        payment: populatedOrder.payment,
        createdAt: populatedOrder.createdAt
      },
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase()
      },
      ingredientUpdates: Object.keys(ingredientUpdates).length
    });

  } catch (error) {
    console.error("Error in addOrder:", error);
    
    // Handle specific error types
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        message: `Payment error: ${error.message}`,
        stripeError: true
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: `Validation error: ${error.message}`
      });
    }
    
    if (error.message && error.message.includes('insufficient stock')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

export { addOrder };