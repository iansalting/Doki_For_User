import React, { useEffect, useState, useCallback } from "react";
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
  const [cartData, setCartData] = useState({
    cart: [],
    summary: {
      totalItems: 0,
      grandTotal: 0,
      categories: [],
      isEmpty: true
    },
    categorizedCart: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [updateLoading, setUpdateLoading] = useState(new Set());
  
  const stripe = useStripe();
  const elements = useElements();

  // Notification system
  const addNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  // Fetch cart data
  const fetchCartData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await axios.get(
        "http://localhost:5000/api/cart/items",
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Filter out invalid items
        const validCartItems = (response.data.cart || []).filter(item => 
          item.productId && item.productId._id
        );

        setCartData({
          cart: validCartItems,
          summary: response.data.summary || { 
            totalItems: 0, 
            grandTotal: 0, 
            categories: [], 
            isEmpty: true 
          },
          categorizedCart: response.data.categorizedCart || {}
        });

        // Notify if invalid items were removed
        const removedCount = (response.data.cart || []).length - validCartItems.length;
        if (removedCount > 0) {
          addNotification(
            `${removedCount} unavailable item(s) were removed from your cart.`,
            'warning'
          );
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch cart');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          "Failed to load cart";
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  // Update item quantity
  const handleUpdateQuantity = useCallback(async (menuItemId, selectedSize, newQuantity) => {
    if (!menuItemId) {
      addNotification('Invalid item. Please refresh the page.', 'error');
      return;
    }

    if (newQuantity < 1 || newQuantity > 99) {
      addNotification('Quantity must be between 1 and 99', 'warning');
      return;
    }

    const updateKey = `${menuItemId}_${selectedSize}`;
    
    try {
      setUpdateLoading(prev => new Set(prev).add(updateKey));
      
      const response = await axios.put(
        "http://localhost:5000/api/cart/update",
        { 
          menuItemId,
          selectedSize,
          quantity: newQuantity 
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        await fetchCartData();
        addNotification('Cart updated', 'success', 2000);
      } else {
        throw new Error(response.data.message || 'Failed to update cart');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          "Failed to update quantity";
      addNotification(errorMessage, 'error');
    } finally {
      setUpdateLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateKey);
        return newSet;
      });
    }
  }, [addNotification, fetchCartData]);

  // Increase quantity
  const handleIncreaseQuantity = useCallback((menuItemId, selectedSize, currentQuantity) => {
    if (currentQuantity >= 99) {
      addNotification('Maximum quantity is 99', 'warning');
      return;
    }
    handleUpdateQuantity(menuItemId, selectedSize, currentQuantity + 1);
  }, [handleUpdateQuantity, addNotification]);

  // Decrease quantity
  const handleReduceQuantity = useCallback((menuItemId, selectedSize, currentQuantity) => {
    if (currentQuantity > 1) {
      handleUpdateQuantity(menuItemId, selectedSize, currentQuantity - 1);
    } else {
      handleRemoveItem(menuItemId, selectedSize);
    }
  }, [handleUpdateQuantity]);

  // Remove item from cart
  const handleRemoveItem = useCallback(async (menuItemId, selectedSize) => {
    if (!menuItemId) {
      addNotification('Invalid item. Please refresh the page.', 'error');
      return;
    }

    const updateKey = `${menuItemId}_${selectedSize}`;

    try {
      setUpdateLoading(prev => new Set(prev).add(updateKey));
      
      const response = await axios.delete(
        "http://localhost:5000/api/cart/remove",
        { 
          data: { menuItemId, selectedSize },
          withCredentials: true 
        }
      );

      if (response.data.success) {
        await fetchCartData();
        addNotification('Item removed', 'success', 2000);
      } else {
        throw new Error(response.data.message || 'Failed to remove item');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          "Failed to remove item";
      addNotification(errorMessage, 'error');
    } finally {
      setUpdateLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateKey);
        return newSet;
      });
    }
  }, [addNotification, fetchCartData]);

  // Handle checkout
  const handleCheckout = useCallback(async () => {
    if (!stripe || !elements) {
      addNotification('Payment system not ready. Please try again.', 'error');
      return;
    }

    if (cartData.summary.isEmpty || cartData.cart.length === 0) {
      addNotification('Your cart is empty', 'warning');
      return;
    }

    setCheckoutLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      const response = await axios.post(
        "http://localhost:5000/api/order/dashboard",
        { paymentMethodId: paymentMethod.id },
        { withCredentials: true }
      );

      if (response.data.success) {
        const orderData = response.data.order;
        
        // Emit socket event for new order
        socket.emit("new-order", {
          userId,
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          customerName: orderData.customerName,
          totalAmount: orderData.bills.totalWithTax,
          itemCount: orderData.items.length,
          items: orderData.items
        });

        // Clear cart data
        setCartData({
          cart: [],
          summary: {
            totalItems: 0,
            grandTotal: 0,
            categories: [],
            isEmpty: true
          },
          categorizedCart: {}
        });

        addNotification(
          `Order #${orderData.orderNumber} placed successfully! Total: ₱${orderData.bills.totalWithTax.toFixed(2)}`, 
          'success', 
          6000
        );
        
        // Redirect to order confirmation
        setTimeout(() => {
          window.location.href = `/order-confirmation/${orderData._id}`;
        }, 3000);
        
      } else {
        throw new Error(response.data.message || 'Checkout failed');
      }
    } catch (err) {
      let errorMessage = "Checkout failed. Please try again.";
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      // Handle specific error cases
      if (errorMessage.includes("Menu item not found")) {
        errorMessage = "Some items are no longer available. Please refresh and try again.";
        fetchCartData();
      } else if (errorMessage.includes("Cart is empty")) {
        errorMessage = "Your cart is empty. Please add items before checkout.";
        fetchCartData();
      } else if (errorMessage.includes("Insufficient")) {
        errorMessage = "Some items don't have enough stock. Please adjust quantities.";
        fetchCartData();
      } else if (errorMessage.includes("Payment failed")) {
        errorMessage = "Payment was declined. Please check your card details.";
      }

      addNotification(errorMessage, 'error', 8000);
    } finally {
      setCheckoutLoading(false);
    }
  }, [stripe, elements, cartData, userId, addNotification, fetchCartData]);

  // Clear invalid cart items
  const clearCart = useCallback(async () => {
    try {
      const response = await axios.delete(
        "http://localhost:5000/api/cart/clear",
        { withCredentials: true }
      );
      
      if (response.data.success) {
        await fetchCartData();
        addNotification('Cart cleared successfully', 'success');
      }
    } catch (err) {
      addNotification('Failed to clear cart', 'error');
    }
  }, [fetchCartData, addNotification]);

  if (loading) {
    return (
      <div className="cart-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-container">
        <div className="error-container">
          <h3>Unable to load cart</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchCartData} className="retry-btn">
              Try Again
            </button>
            <button onClick={clearCart} className="clear-btn">
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { cart, summary } = cartData;

  return (
    <div className="cart-container">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
              onClick={() => removeNotification(notification.id)}
            >
              <div className="notification-content">
                <span className="notification-message">{notification.message}</span>
              </div>
              <button 
                className="notification-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="cart-header">
        <h2>Your Cart</h2>
        {!summary.isEmpty && (
          <span className="item-count">{summary.totalItems} item{summary.totalItems !== 1 ? 's' : ''}</span>
        )}
      </div>
      
      {summary.isEmpty ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some delicious items to get started!</p>
          <button 
            onClick={() => window.location.href = '/order'} 
            className="continue-shopping-btn"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <>
          {/* Order Summary */}
          {summary.categories.length > 0 && (
            <div className="order-summary">
              <h3>Order Summary</h3>
              <div className="summary-categories">
                {summary.categories.map((category) => (
                  <div key={category.category} className="category-row">
                    <span className="category-name">{category.category}</span>
                    <span className="category-details">
                      {category.itemCount} item{category.itemCount !== 1 ? 's' : ''} • ₱{category.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>₱{summary.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Cart Items */}
          <div className="cart-items">
            <h3>Items in your cart</h3>
            {cart.map((item) => {
              const updateKey = `${item.productId._id}_${item.selectedSize}`;
              const isUpdating = updateLoading.has(updateKey);

              return (
                <div key={updateKey} className={`cart-item ${isUpdating ? 'updating' : ''}`}>
                  <div className="item-main">
                    <div className="item-info">
                      <h4 className="item-name">{item.productId?.name || "Unknown Product"}</h4>
                      <span className="item-category">{item.productId?.category || "Unknown"}</span>
                      {item.productId.description && (
                        <p className="item-description">{item.productId.description}</p>
                      )}
                      <div className="item-meta">
                        <span className="item-size">Size: {item.selectedSize || "Standard"}</span>
                        <span className="item-price">₱{item.unitPrice?.toFixed(2) || "0.00"} each</span>
                      </div>
                    </div>

                    <div className="item-controls">
                      <div className="quantity-section">
                        <label className="quantity-label">Quantity</label>
                        <div className="quantity-controls">
                          <button
                            onClick={() => handleReduceQuantity(
                              item.productId._id, 
                              item.selectedSize, 
                              item.quantity
                            )}
                            className="qty-btn qty-decrease"
                            disabled={isUpdating}
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="quantity-display">{item.quantity}</span>
                          <button
                            onClick={() => handleIncreaseQuantity(
                              item.productId._id, 
                              item.selectedSize, 
                              item.quantity
                            )}
                            className="qty-btn qty-increase"
                            disabled={isUpdating || item.quantity >= 99}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="item-total">
                        <span className="total-label">Total</span>
                        <span className="total-amount">₱{item.itemTotal?.toFixed(2) || "0.00"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      onClick={() => handleRemoveItem(item.productId._id, item.selectedSize)}
                      className="remove-btn"
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Section */}
          <div className="payment-section">
            <h3>Payment Information</h3>
            <div className="card-element-container">
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
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
          </div>

          {/* Checkout Section */}
          <div className="checkout-section">
            <div className="checkout-total">
              <span>Total: ₱{summary.grandTotal.toFixed(2)}</span>
            </div>
            
            <div className="checkout-actions">
              <button 
                className={`checkout-btn ${checkoutLoading ? 'loading' : ''}`}
                onClick={handleCheckout}
                disabled={checkoutLoading || !stripe || cart.length === 0}
              >
                {checkoutLoading ? (
                  <span>Processing Payment...</span>
                ) : (
                  <span>Place Order • ₱{summary.grandTotal.toFixed(2)}</span>
                )}
              </button>
              
              <button 
                onClick={() => window.location.href = '/order'}
                className="continue-shopping-btn secondary"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}