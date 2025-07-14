import React, { useState, useEffect } from "react";
import {
  ChefHat,
  DollarSign,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
} from "lucide-react";
import "./order.css";

const Order = () => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'success' or 'error'

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/menu/");
      const data = await response.json();

      if (data.success) {
        setMenus(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (menuItemId, quantity = 1) => {
    try {
      const response = await fetch("http://localhost:5000/api/cart/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ menuItemId, quantity }),
      });

      if (response.ok) {
        setMessage("Item added to cart successfully!");
        setMessageType("success");

        const menuItem = menus.find((menu) => menu._id === menuItemId);
        if (menuItem) {
          setMessage(`${menuItem.name} (${quantity}) added to cart!`);
        }
      } else {
        const error = await response.json();
        setMessage("Failed to add item: " + error.message);
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      setMessage("An error occurred while adding to cart.");
      setMessageType("error");
    }

    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  };

  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity >= 1) {
      setQuantities((prev) => ({ ...prev, [menuItemId]: newQuantity }));
    }
  };

  const getQuantity = (menuItemId) => quantities[menuItemId] || 1;

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="order-container">
      <div className="order-header">
        <h1>Our Menu</h1>
        <p>Discover our delicious offerings</p>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {messageType === "success" ? (
            <CheckCircle className="icon small" />
          ) : (
            <XCircle className="icon small" />
          )}
          <span>{message}</span>
        </div>
      )}

      {menus.length === 0 ? (
        <div className="empty-menu">
          <ChefHat className="icon large-icon" />
          <h3>No menu items found</h3>
          <p>Check back later for our delicious offerings!</p>
        </div>
      ) : (
        <div className="menu-grid">
          {menus.map((menu) => (
            <div key={menu._id} className="menu-card">
              <div className="menu-card-content">
                <div className="menu-title-row">
                  <h3>{menu.name}</h3>
                </div>

                {menu.description && (
                  <p className="menu-description">{menu.description}</p>
                )}

                <div className="menu-info">
                  <div>
                    <DollarSign className="icon small" /> ${menu.price?.toFixed(2)}
                  </div>
                </div>

                {menu.category && (
                  <div className="menu-category">{menu.category}</div>
                )}

                <div className="menu-actions">
                  <div className="quantity-controls">
                    <button
                      onClick={() =>
                        updateQuantity(menu._id, getQuantity(menu._id) - 1)
                      }
                      disabled={getQuantity(menu._id) <= 1}
                    >
                      <Minus className="icon small" />
                    </button>
                    <span className="quantity-display">
                      {getQuantity(menu._id)}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(menu._id, getQuantity(menu._id) + 1)
                      }
                    >
                      <Plus className="icon small" />
                    </button>
                  </div>

                  <button
                    onClick={() => addToCart(menu._id, getQuantity(menu._id))}
                    className="add-to-cart-btn"
                  >
                    <ShoppingCart className="icon small" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Order;
