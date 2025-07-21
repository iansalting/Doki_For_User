import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./login.css";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage("success", "Login successful!");
        setFormData({ email: "", password: "" });
        setTimeout(() => navigate("/order"), 1000);
      } else {
        switch (response.status) {
          case 400:
            showMessage("error", data.message || "Missing email or password");
            break;
          case 401:
            showMessage("error", "Wrong password. Please try again.");
            break;
          case 404:
            showMessage("error", "Account with this email was not found.");
            break;
          default:
            showMessage("error", data.message || "Something went wrong.");
        }
      }
    } catch (error) {
      showMessage("error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Welcome Back</h1>
        <p>Sign in to your account</p>

        {message.text && (
          <div className={`alert ${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <Mail size={20} />
              <input
                type="email"
                autoComplete="username"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={20} />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="login-footer">
            <button type="button" onClick={() => navigate("/forgot-password")}>
              Forgot your password?
            </button>
            <p>
              Don't have an account?
              <button type="button" onClick={() => navigate("/register")}>
                Sign up
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
