import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./navBar.css";


function Navbar() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.navbar')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);


  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [navigate]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogoutClick = () => {
    setShowConfirmDialog(true);
    setIsMobileMenuOpen(false); 
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setError('');
    setShowConfirmDialog(false);
    
    try {
      const response = await axios.post('http://localhost:5000/user/logout', {}, { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        sessionStorage.clear();
        
        navigate('/login', { replace: true });
      }
    } catch (err) {
      console.error('Logout failed:', err);

      if (err.response?.status === 401) {
        // Token invalid/expired or no token
        const message = err.response?.data?.message;
        if (message === "No token. Unauthorized" || 
            message === "Invalid or expired token") {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          sessionStorage.clear();
          navigate('/login', { replace: true });
        } else {
          setError('Session expired. Please log in again.');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
        }
      } else if (err.response?.status === 404) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        sessionStorage.clear();
        navigate('/login', { replace: true });
      } else {
        setError(err.response?.data?.message || 'Logout failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setError('');
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        {/* Hamburger Menu Button */}
        <button
          className={`navbar-hamburger ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation Menu */}
        <ul className={isMobileMenuOpen ? 'active' : ''}>
          <li>
            <Link to="/order" onClick={handleLinkClick}>
              My Orders
            </Link>
          </li>
          <li>
            <Link to="/cart" onClick={handleLinkClick}>
              My Cart
            </Link>
          </li>
          <li>
            <button
              onClick={handleLogoutClick}
              disabled={isLoading}
              className={`navbar-logout-btn ${isLoading ? 'loading' : ''}`}
              aria-label="Logout from application"
            >
              {isLoading ? (
                <span className="logout-loading">
                  <span className="spinner"></span>
                  Logging out...
                </span>
              ) : (
                'Logout'
              )}
            </button>
          </li>
        </ul>
      </nav>

      {/* Logout Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="logout-confirm-overlay" onClick={handleCancel}>
          <div className="logout-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="logout-confirm-actions">
              <button 
                onClick={handleLogout}
                className="logout-confirm-yes"
                disabled={isLoading}
              >
                Yes, Logout
              </button>
              <button 
                onClick={handleCancel}
                className="logout-confirm-no"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Toast */}
      {error && (
        <div className="logout-error-toast" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

export default Navbar;