
import Stripe from "stripe";
import Ingredient from "../model/ingredientModel.js";
import Transaction from "../model/transactionModel.js";
import Order from "../model/orderModel.js";
import User from "../model/userModel.js";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const addOrder = async (req, res, next) => {
  try {
    const { userId, paymentMethodId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ success: false, message: "Payment method ID is required" });
    }

    const user = await User.findById(userId).populate({
      path: 'cart.productId',
      model: 'Menu',
      select: 'name price ingredients category'
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }


    const orderItems = [];
    let subtotal = 0;
    const ingredientUpdate = {}; 


    for (const cartItem of user.cart) {
      const menuItem = cartItem.productId;
      
      if (!menuItem) {
        return res.status(404).json({ 
          success: false, 
          message: `Menu item not found in cart` 
        });
      }


      orderItems.push({
        menuItem: menuItem._id,
        quantity: cartItem.quantity
      });


      subtotal += menuItem.price * cartItem.quantity;


      if (menuItem.ingredients && menuItem.ingredients.length > 0) {
        for (const ingredientUsage of menuItem.ingredients) {
          const ingredientId = ingredientUsage.ingredient.toString();
          const requiredAmount = ingredientUsage.quantity * cartItem.quantity;
          

          if (ingredientUpdate[ingredientId]) {
            ingredientUpdate[ingredientId] += requiredAmount;
          } else {
            ingredientUpdate[ingredientId] = requiredAmount;
          }
        }
      }
    }


    const ingredientIds = Object.keys(ingredientUpdate);
    const ingredients = await Ingredient.find({ _id: { $in: ingredientIds } });
    
    for (const ingredient of ingredients) {
      const requiredAmount = ingredientUpdate[ingredient._id.toString()];
      const availableQuantity = ingredient.stockQuantity !== undefined ? ingredient.stockQuantity : ingredient.quantity;
      
      if (availableQuantity < requiredAmount) {
        return res.status(400).json({
          success: false,
          message: `Not enough ${ingredient.name} in stock. Need ${requiredAmount} but only have ${availableQuantity}`
        });
      }
    }

    const taxRate = 0.08;
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    const totalWithTax = parseFloat((subtotal + taxAmount).toFixed(2));


    const amountInCents = Math.round(totalWithTax * 100);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'php',
        payment_method: paymentMethodId,
        confirm: true,
        description: `Order for user ${userId}`,
        metadata: {
          userId: userId.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never' 
        }
      });


      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: "Payment failed",
          paymentStatus: paymentIntent.status
        });
      }

      const bills = {
        total: subtotal,          
        tax: taxAmount,            
        totalWithTax: totalWithTax  
      };

      const newOrder = new Order({
        user: userId,
        status: "pending",
        items: orderItems,
        bills: bills, 
        payment: "stripe", 
        paymentDetails: {
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentMethodId,
          stripeCustomerId: paymentIntent.customer || null
        }
      });

      const savedOrder = await newOrder.save();
      console.log("Order saved with ID:", savedOrder._id);

      const itemDetails = user.cart.map(cartItem => {
        const menuItem = cartItem.productId;
        return {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: cartItem.quantity,
          subtotal: parseFloat((menuItem.price * cartItem.quantity).toFixed(2))
        };
      });


      const transactionData = {
        orderId: savedOrder._id,
        type: "payment",
        status: "completed",
        amount: totalWithTax,
        date: new Date(),
        details: {
          userId: userId,
          items: itemDetails,
          bills: {  
            subtotal: subtotal,
            tax: taxAmount,
            total: totalWithTax
          },
          orderStatus: "pending",
          paymentIntentId: paymentIntent.id
        }
      };
      
      console.log("Creating transaction with data:", JSON.stringify(transactionData));
      const transaction = new Transaction(transactionData);
      
      const savedTransaction = await transaction.save();
      console.log("Transaction saved with ID:", savedTransaction._id);

      // Update ingredient quantities
      console.log("Updating ingredient quantities...");
      for (const [ingredientId, requiredAmount] of Object.entries(ingredientUpdate)) {
        console.log(`Reducing ingredient ${ingredientId} by ${requiredAmount}`);
        

        const ingredient = ingredients.find(i => i._id.toString() === ingredientId);
        const fieldName = ingredient.hasOwnProperty('stockQuantity') ? 'stockQuantity' : 'quantity';
        
        const updateQuery = {};
        updateQuery[`$inc`] = { [fieldName]: -requiredAmount };
        
        const updatedIngredient = await Ingredient.findByIdAndUpdate(
          ingredientId,
          updateQuery,
          { new: true }
        );
        
        if (updatedIngredient) {
          console.log(`Successfully updated ingredient ${updatedIngredient.name} to new quantity: ${updatedIngredient[fieldName]}`);
        } else {
          console.error(`Failed to update ingredient ${ingredientId}`);
        }
      }


      user.cart = [];
      await user.save();

      return res.status(201).json({
        success: true,
        message: "Order placed and payment processed successfully",
        order: savedOrder,
        transaction: savedTransaction,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status
        }
      });
    } catch (stripeError) {
      console.error("Stripe error:", stripeError);
      return res.status(400).json({
        success: false,
        message: "Payment failed",
        error: stripeError.message
      });
    }
    
  } catch (error) {
    console.error("Error in addOrder:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message
    });
  }
};

export { addOrder };