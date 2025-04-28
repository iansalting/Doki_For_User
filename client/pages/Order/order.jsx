import React, { useState, useEffect } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import './order.css'


const stripePromise = loadStripe("pk_test_51RCuqlQrQdtxdh7TAzoMjd4g02PTocNQ0gYCFk9M269G3hvhipbXzglG5flwDiJAamncPPV9aDNAQdXphHWGXnqE00zImpQq7q");

const CheckoutForm = ({ totalPrice, userId, cart, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {

      return;
    }

    setProcessing(true);

    const cardElement = elements.getElement(CardElement);

    const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (paymentMethodError) {
      setError(paymentMethodError.message);
      setProcessing(false);
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/api/order/dashboard", {
        userId,
        paymentMethodId: paymentMethod.id
      });

      if (response.data.success) {
        onSuccess(response.data);
      } else {
        setError("Payment failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "An error occurred during payment.");
      console.error(err);
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="payment-card">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <button 
        type="submit" 
        disabled={!stripe || processing || cart.length === 0}
        className="checkout-button"
      >
        {processing ? "Processing..." : `Pay PHP ${totalPrice.toFixed(2)}`}
      </button>
    </form>
  );
};

// Main Order Component
export default function Order() {
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId] = useState("67f8ca62716f3f32e40a3c73");
  const [successMessage, setSuccessMessage] = useState("");
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/menu/");
        setMenus(response.data.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/cart/${userId}`
        );
        setCart(response.data.cart);
      } catch (error) {
        setError(error.message);
      }
    };
    fetchCart();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const totalPrice = cart.reduce(
    (acc, item) => acc + item.productId.price * item.quantity,
    0
  );

  const handleAddToCart = async (menuId) => {
    try {
      if (!userId) {
        alert("Please log in to add items to your cart.");
        return;
      }

      const response = await axios.post("http://localhost:5000/api/cart/post", {
        userId,
        menuItemId: menuId,
      });

      if (response.data.success) {
        setSuccessMessage("Item added to cart successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);

        const cartResponse = await axios.get(
          `http://localhost:5000/api/cart/${userId}`
        );
        setCart(cartResponse.data.cart);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReduceQuantity = async (menuId) => {
    try {
      if (cart.find((item) => item.productId._id === menuId).quantity > 1) {
        await axios.patch("http://localhost:5000/api/cart/update", {
          userId,
          menuItemId: menuId,
          quantity:
            cart.find((item) => item.productId._id === menuId).quantity - 1,
        });
        const cartResponse = await axios.get(
          `http://localhost:5000/api/cart/${userId}`
        );
        setCart(cartResponse.data.cart);
      } else {
        handleRemoveItem(menuId);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveItem = async (menuId) => {
    try {
      await axios.delete("http://localhost:5000/api/cart/remove", {
        data: {
          userId,
          menuItemId: menuId,
        }
      });

      const cartResponse = await axios.get(
        `http://localhost:5000/api/cart/${userId}`
      );
      setCart(cartResponse.data.cart);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentSuccess = (data) => {
    setOrderComplete(true);
    setOrderDetails(data);
    setSuccessMessage("Payment successful! Your order has been placed.");
    

    setCart([]);
  };

  if (orderComplete) {
    return (
      <div className="order-confirmation">
        <h1>Order Confirmation</h1>
        <div className="success-message">{successMessage}</div>
        <div className="order-details">
          <h2>Order #{orderDetails?.order?._id}</h2>
          <p>Status: {orderDetails?.order?.status}</p>
          <p>Total: Php{orderDetails?.transaction?.amount.toFixed(2)}</p>
          <button onClick={() => setOrderComplete(false)}>
            Return to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      <div className="container-1">
        <h1>Menu</h1>
        {menus.length === 0 ? (
          <p>No menu items found</p>
        ) : (
          <ul>
            {menus.map((menu) => (
              <li key={menu._id}>
                <h2>{menu.name}</h2>
                <p>Price: Php{menu.price}</p>
                <button onClick={() => handleAddToCart(menu._id)}>
                  Add to Cart
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="container-2">
        <h1>Cart</h1>
        {cart.length === 0 ? (
          <p>No items in cart</p>
        ) : (
          <>
            <ul>
              {cart.map((item) => (
                <li key={item.productId._id}>
                  <h2>{item.productId.name}</h2>
                  <p>Price: Php{item.productId.price}</p>
                  <p>Quantity: {item.quantity}</p>
                  <p>Subtotal: Php{item.productId.price * item.quantity}</p>
                  <button onClick={() => handleReduceQuantity(item.productId._id)}> - </button>
                  <button onClick={() => handleRemoveItem(item.productId._id)}>Remove Item</button>
                </li>
              ))}
            </ul>
            <div className="cart-total">
              <h3>Total: Php{totalPrice.toFixed(2)}</h3>
            </div>
            
            {/* Stripe Payment Integration */}
            <div className="payment-section">
              <h2>Payment Details</h2>
              <Elements stripe={stripePromise}>
                <CheckoutForm 
                  totalPrice={totalPrice} 
                  userId={userId}
                  cart={cart}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </div>
          </>
        )}
      </div>
    </div>
  );
}