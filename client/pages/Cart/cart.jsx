import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import stripePromise from "../Order/stripe";
import "./cart.css";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function CartWrapper({ userId }) {
  return (
    <Elements stripe={stripePromise}>
      <Cart userId={userId} />
    </Elements>
  );
}

function Cart({ userId }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/cart/items",
          {
            withCredentials: true,
          }
        );
        setCart(response.data.cart);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch cart");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  const handleUpdateQuantity = async (menuItemId, newQuantity) => {
    try {
      await axios.put(
        "http://localhost:5000/api/cart/update",
        { 
          menuItemId: menuItemId,
          quantity: newQuantity 
        },
        { withCredentials: true }
      );

      // Update local state
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.productId._id === menuItemId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update item quantity.");
    }
  };

  const handleIncreaseQuantity = (menuItemId, currentQuantity) => {
    handleUpdateQuantity(menuItemId, currentQuantity + 1);
  };

  const handleReduceQuantity = (menuItemId, currentQuantity) => {
    if (currentQuantity > 1) {
      handleUpdateQuantity(menuItemId, currentQuantity - 1);
    } else {
      // If quantity is 1, remove the item instead
      handleRemoveItem(menuItemId);
    }
  };

  const handleRemoveItem = async (menuItemId) => {
    try {
      await axios.delete(
        "http://localhost:5000/api/cart/remove",
        { 
          data: { menuItemId },
          withCredentials: true 
        }
      );

      // Update local state
      setCart((prevCart) => 
        prevCart.filter((item) => item.productId._id !== menuItemId)
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove item.");
    }
  };

  const handleCheckout = async () => {
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (error) {
      console.error("Payment Method error:", error);
      alert(error.message);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/order/dashboard",
        {
          paymentMethodId: paymentMethod.id,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        socket.emit("new-order", {
          userId,
          cart,
        });

        alert("Payment and order successful!");
        window.location.reload();
      }
    } catch (err) {
      console.error("Checkout error:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Unknown error occurred";

      alert(message);
    }
  };

  // Calculate total price
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      return total + (item.quantity * (item.productId?.price || 0));
    }, 0).toFixed(2);
  };

  if (loading) return <div>Loading cart...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul>
            {cart.map((item) => (
              <li key={item._id} className="cart-item">
                <p>
                  <strong>Product:</strong>{" "}
                  {item.productId?.name || "Unknown Product"}
                </p>
                <div className="quantity-controls">
                  <p>
                    <strong>Quantity:</strong> 
                    <button
                      onClick={() => handleReduceQuantity(item.productId._id, item.quantity)}
                      className="qty-btn"
                    >
                      -
                    </button>
                    <span className="quantity-display">{item.quantity}</span>
                    <button
                      onClick={() => handleIncreaseQuantity(item.productId._id, item.quantity)}
                      className="qty-btn"
                    >
                      +
                    </button>
                  </p>
                </div>
                <p>
                  <strong>Price:</strong> ₱
                  {item.productId?.price?.toFixed(2) || "0.00"}
                </p>
                <p>
                  <strong>Total:</strong> ₱
                  {(item.quantity * (item.productId?.price || 0)).toFixed(2)}
                </p>
                <button
                  onClick={() => handleRemoveItem(item.productId._id)}
                  className="remove-btn"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-total">
            <h3>Cart Total: ₱{calculateTotal()}</h3>
          </div>

          <div className="card-element-wrapper">
            <CardElement />
          </div>

          <button className="checkout-btn" onClick={handleCheckout}>
            Proceed to Checkout
          </button>
        </>
      )}
    </div>
  );
}