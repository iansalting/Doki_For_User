import React, { useState, useEffect } from "react";
import {
  ChefHat,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  Info,
  Filter,
  ImageIcon,
  Image as ImageLucide,
} from "lucide-react";
import "./order.css";

const Order = () => {
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states for size selection
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalSelectedSize, setModalSelectedSize] = useState(null);

  // Enhanced image loading states
  const [imageErrors, setImageErrors] = useState({});
  const [imageLoading, setImageLoading] = useState({});

  // Enhanced notification system
  const [notifications, setNotifications] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({});

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/menu/");
      const data = await response.json();
      if (data.success) {
        console.log("Menu data received:", data.data); // Debug log
        setMenus(data.data || []);
        setCategories(["All", ...(data.categories || [])]);
        
        // Log image URLs for debugging
        data.data?.forEach(menu => {
          if (menu.imageUrl) {
            console.log(`${menu.name} image URL:`, menu.imageUrl);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching menus:", error);
      addNotification("Failed to load menu items. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  };

  // Enhanced notification system
  const addNotification = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Confirmation dialog system
  const showConfirmation = ({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    setConfirmDialogConfig({
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText
    });
    setShowConfirmDialog(true);
  };

  const hideConfirmation = () => {
    setShowConfirmDialog(false);
    setConfirmDialogConfig({});
  };

  // Replace any potential window.alert usage
  const showAlert = (message, type = 'info') => {
    addNotification(message, type);
  };

  // Replace any potential window.confirm usage
  const showConfirm = (message, onConfirm, onCancel) => {
    showConfirmation({
      title: 'Confirmation',
      message,
      onConfirm: () => {
        onConfirm && onConfirm();
        hideConfirmation();
      },
      onCancel: () => {
        onCancel && onCancel();
        hideConfirmation();
      }
    });
  };

  const addToCart = async (menuItemId, quantity = 1, size = null) => {
    try {
      const menuItem = menus.find((menu) => menu._id === menuItemId);
      if (!menuItem) {
        addNotification("Menu item not found.", "error");
        return;
      }

      const cartData = {
        menuItemId,
        quantity,
        selectedSize: size?.label || "Classic",
        price: size?.price || menuItem.basePrice,
      };

      const response = await fetch("http://localhost:5000/api/cart/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: JSON.stringify(cartData),
      });

      if (response.ok) {
        const sizeName = size ? ` (${size.label})` : "";
        addNotification(
          `${menuItem.name}${sizeName} (${quantity}) added to cart!`,
          "success"
        );
        setQuantities((prev) => ({ ...prev, [menuItemId]: 1 }));
      } else {
        const error = await response.json();
        addNotification(
          "Failed to add item: " + (error.message || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      addNotification("An error occurred while adding to cart.", "error");
    }
  };

  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantities((prev) => ({ ...prev, [menuItemId]: newQuantity }));
    }
  };

  const getQuantity = (menuItemId) => quantities[menuItemId] || 1;
  const isRamenCategory = (menu) => menu.category === "ramen";

  // Enhanced image handling functions
  const handleImageError = (menuId) => {
    console.log(`Image failed to load for menu: ${menuId}`);
    setImageErrors((prev) => ({ ...prev, [menuId]: true }));
    setImageLoading((prev) => ({ ...prev, [menuId]: false }));
  };

  const handleImageLoad = (menuId) => {
    console.log(`Image loaded successfully for menu: ${menuId}`);
    setImageLoading((prev) => ({ ...prev, [menuId]: false }));
  };

  const handleImageLoadStart = (menuId) => {
    setImageLoading((prev) => ({ ...prev, [menuId]: true }));
  };

  // Enhanced MenuImage component with better error handling and loading states
  const MenuImage = ({ menu }) => {
    const hasError = imageErrors[menu._id];
    const isLoading = imageLoading[menu._id];
    
    // Debug log
    console.log(`MenuImage for ${menu.name}:`, {
      imageUrl: menu.imageUrl,
      hasError,
      isLoading,
      image: menu.image
    });
    
    if (!menu.imageUrl || hasError) {
      return (
        <div className="menu-image-placeholder">
          <ChefHat className="placeholder-icon" />
          <span className="placeholder-text">
            {hasError ? "Image failed to load" : "No Image"}
          </span>
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="debug-info">
              <small>URL: {menu.imageUrl || 'None'}</small>
              <br />
              <small>File: {menu.image || 'None'}</small>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="menu-image-wrapper">
        {isLoading && (
          <div className="image-loading-overlay">
            <div className="loading-spinner-small"></div>
          </div>
        )}
        <img
          src={menu.imageUrl}
          alt={menu.imageAlt || menu.name}
          className={`menu-image ${isLoading ? 'loading' : ''}`}
          onError={() => handleImageError(menu._id)}
          onLoad={() => handleImageLoad(menu._id)}
          onLoadStart={() => handleImageLoadStart(menu._id)}
          loading="lazy"
        />
      </div>
    );
  };

  // Size modal functions
  const openSizeModal = (menuItem) => {
    setSelectedMenuItem(menuItem);
    setModalQuantity(getQuantity(menuItem._id));
    setModalSelectedSize(null);
    setShowSizeModal(true);
  };

  const closeSizeModal = () => {
    setShowSizeModal(false);
    setSelectedMenuItem(null);
    setModalSelectedSize(null);
    setModalQuantity(1);
  };

  const selectSize = (size) => {
    if (size.isAvailable) {
      setModalSelectedSize(size);
    }
  };

  const addSizeToCart = () => {
    if (selectedMenuItem && modalSelectedSize) {
      addToCart(selectedMenuItem._id, modalQuantity, modalSelectedSize);
      closeSizeModal();
    }
  };

  const addDirectToCart = (menuItem) => {
    const classicSize = menuItem.sizes?.find(
      (size) => size.label === "Classic"
    );
    addToCart(menuItem._id, getQuantity(menuItem._id), classicSize);
  };

  // Filter and group menus
  const filteredMenus = menus.filter((menu) => {
    const matchesCategory =
      activeCategory === "All" || menu.category === activeCategory;
    const matchesSearch = menu.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedMenus = () => {
    if (activeCategory !== "All") {
      return [{ category: activeCategory, items: filteredMenus }];
    }

    const grouped = {};
    filteredMenus.forEach((menu) => {
      const category = menu.category || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(menu);
    });

    return Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
    }));
  };

  const renderAvailabilityStatus = (menu) => {
    return menu.isAvailable ? (
      <div className="availability-status available">
        <CheckCircle className="icon" />
        <span>Available</span>
      </div>
    ) : (
      <div className="availability-status unavailable">
        <XCircle className="icon" />
        <span>Not Available</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="order-container">
      <div className="order-header">
        <h1>Our Menu</h1>
        <p>Discover our delicious offerings</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="menu-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filter">
          <Filter className="icon" />
          <span>Categories:</span>
          <div className="category-buttons">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`category-btn ${
                  activeCategory === category ? "active" : ""
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Notification System */}
      <div className="notifications-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification ${notification.type}`}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="notification-content">
              {notification.type === "success" && <CheckCircle className="notification-icon" />}
              {notification.type === "error" && <XCircle className="notification-icon" />}
              {notification.type === "info" && <Info className="notification-icon" />}
              {notification.type === "warning" && <Info className="notification-icon" />}
              <span className="notification-message">{notification.message}</span>
            </div>
            <button 
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay confirmation-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <h3>{confirmDialogConfig.title}</h3>
            </div>
            <div className="confirmation-body">
              <p>{confirmDialogConfig.message}</p>
            </div>
            <div className="confirmation-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  confirmDialogConfig.onCancel && confirmDialogConfig.onCancel();
                  hideConfirmation();
                }}
              >
                {confirmDialogConfig.cancelText}
              </button>
              <button
                className="btn-confirm"
                onClick={() => {
                  confirmDialogConfig.onConfirm && confirmDialogConfig.onConfirm();
                  hideConfirmation();
                }}
              >
                {confirmDialogConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Display - Keep for backward compatibility */}
      {message && (
        <div className={`message ${messageType}`}>
          {messageType === "success" ? (
            <CheckCircle className="icon" />
          ) : (
            <XCircle className="icon" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Menu Content */}
      {filteredMenus.length === 0 ? (
        <div className="error-container">
          <ChefHat className="large-icon" />
          <h3>No menu items found</h3>
          <p>Try adjusting your search or category filter!</p>
        </div>
      ) : (
        <div className="menu-content">
          {groupedMenus().map((group) => (
            <div key={group.category} className="category-section">
              {/* Category Header */}
              {activeCategory === "All" && (
                <div className="category-header">
                  <h2 className="category-title">{group.category}</h2>
                  <div className="category-line"></div>
                </div>
              )}

              {/* Menu Grid */}
              <div className="menu-grid">
                {group.items.map((menu) => (
                  <div
                    key={menu._id}
                    className={`menu-card ${
                      !menu.isAvailable ? "unavailable" : ""
                    }`}
                  >
                    {/* Enhanced Menu Image Container */}
                    <div className="menu-image-container">
                      <MenuImage menu={menu} />
                      {menu.imageUrl && !imageErrors[menu._id] && (
                        <div className="image-overlay">
                          <ImageLucide className="overlay-icon" />
                        </div>
                      )}
                      {/* Image status indicator */}
                      {menu.imageUrl && (
                        <div className="image-status-indicator">
                          {imageErrors[menu._id] ? (
                            <XCircle className="status-icon error" />
                          ) : imageLoading[menu._id] ? (
                            <div className="status-icon loading">⟳</div>
                          ) : (
                            <CheckCircle className="status-icon success" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="menu-card-content">
                      <div className="menu-title-row">
                        <h3>{menu.name}</h3>
                        {renderAvailabilityStatus(menu)}
                      </div>

                      {menu.description && (
                        <p className="menu-description">{menu.description}</p>
                      )}

                      {/* Price Display */}
                      <div className="menu-price-section">
                        {isRamenCategory(menu) ? (
                          <div className="size-preview">
                            <span className="size-count">
                              {menu.sizes?.length || 0} size
                              {(menu.sizes?.length || 0) !== 1 ? "s" : ""}{" "}
                              available
                            </span>
                            {menu.sizes && menu.sizes.length > 0 && (
                              <div className="price-range">
                                {menu.sizes.length === 1 ? (
                                  <span className="price">
                                    ₱{menu.sizes[0].price.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="price">
                                    ₱
                                    {Math.min(
                                      ...menu.sizes.map((s) => s.price)
                                    ).toFixed(2)}{" "}
                                    - ₱
                                    {Math.max(
                                      ...menu.sizes.map((s) => s.price)
                                    ).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="single-price">
                            <span className="price">
                              ₱{menu.basePrice?.toFixed(2) || "N/A"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Category Badge */}
                      <div className="menu-category-badge">{menu.category}</div>

                      {/* Actions */}
                      <div className="menu-actions">
                        {menu.isAvailable && !isRamenCategory(menu) && (
                          <div className="quantity-controls">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  menu._id,
                                  getQuantity(menu._id) - 1
                                )
                              }
                              disabled={getQuantity(menu._id) <= 1}
                              className="quantity-btn"
                            >
                              <Minus className="icon" />
                            </button>
                            <div className="quantity-display">
                              {getQuantity(menu._id)}
                            </div>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  menu._id,
                                  getQuantity(menu._id) + 1
                                )
                              }
                              className="quantity-btn"
                            >
                              <Plus className="icon" />
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            if (isRamenCategory(menu)) {
                              openSizeModal(menu);
                            } else {
                              addDirectToCart(menu);
                            }
                          }}
                          disabled={!menu.isAvailable}
                          className={`add-to-cart-btn ${
                            !menu.isAvailable ? "disabled" : ""
                          }`}
                        >
                          <ShoppingCart className="icon" />
                          <span>
                            {!menu.isAvailable
                              ? "Unavailable"
                              : isRamenCategory(menu)
                              ? "Choose Size"
                              : "Add to Cart"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Size Selection Modal */}
      {showSizeModal && selectedMenuItem && (
        <div className="modal-overlay" onClick={closeSizeModal}>
          <div className="size-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                {/* Enhanced Modal Image */}
                <div className="modal-image-container">
                  <MenuImage menu={selectedMenuItem} />
                </div>
                <div className="modal-title-section">
                  <h2>{selectedMenuItem.name}</h2>
                  <button className="close-btn" onClick={closeSizeModal}>
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-body">
              {selectedMenuItem.description && (
                <p className="modal-description">
                  {selectedMenuItem.description}
                </p>
              )}

              <div className="size-options">
                <h3>Choose Size:</h3>
                {selectedMenuItem.sizes?.map((size) => (
                  <div
                    key={size._id}
                    className={`size-option ${
                      !size.isAvailable ? "size-unavailable" : ""
                    } ${modalSelectedSize?._id === size._id ? "selected" : ""}`}
                    onClick={() => selectSize(size)}
                  >
                    <div className="size-info">
                      <div className="size-name-price">
                        <span className="size-name">{size.label}</span>
                        <span className="size-price">
                          ₱{size.price.toFixed(2)}
                        </span>
                      </div>
                      {!size.isAvailable && (
                        <span className="unavailable-text">Unavailable</span>
                      )}
                    </div>

                    {size.ingredients && size.ingredients.length > 0 && (
                      <div className="size-ingredients">
                        <p>Ingredients:</p>
                        <div className="ingredient-list">
                          {size.ingredients.map((ing, idx) => (
                            <span key={idx} className="ingredient-tag">
                              {ing.ingredient.name} ({ing.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {modalSelectedSize && (
                <div className="modal-controls">
                  <div className="quantity-section">
                    <label>Quantity:</label>
                    <div className="quantity-controls">
                      <button
                        onClick={() =>
                          setModalQuantity(Math.max(1, modalQuantity - 1))
                        }
                        className="quantity-btn"
                      >
                        <Minus className="icon" />
                      </button>
                      <span className="quantity-display">{modalQuantity}</span>
                      <button
                        onClick={() =>
                          setModalQuantity(Math.min(99, modalQuantity + 1))
                        }
                        className="quantity-btn"
                      >
                        <Plus className="icon" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={addSizeToCart}
                    className="confirm-btn"
                    disabled={!modalSelectedSize.isAvailable}
                  >
                    Add to Cart - ₱
                    {(modalSelectedSize.price * modalQuantity).toFixed(2)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="info-section">
        <div className="info-header">
          <Info className="icon" />
          <h3>Availability Status</h3>
        </div>
        <div className="info-content">
          <div className="info-item">
            <CheckCircle className="icon available" />
            <span>
              <strong>Available:</strong> All ingredients in stock
            </span>
          </div>
          <div className="info-item">
            <XCircle className="icon unavailable" />
            <span>
              <strong>Not Available:</strong> Missing or insufficient
              ingredients
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Order;