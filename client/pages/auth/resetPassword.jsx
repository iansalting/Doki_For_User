import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import './resetPassword.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password validation
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const validCount = Object.values(requirements).filter(Boolean).length;
    let strength = 'weak';
    if (validCount >= 4) strength = 'strong';
    else if (validCount >= 2) strength = 'medium';
    
    return { requirements, strength };
  };

  const { requirements, strength } = validatePassword(formData.password);
  const passwordsMatch = formData.password && formData.confirmPassword && 
                        formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    
    try {
      const res = await fetch(
        `http://localhost:5000/user/reset-password/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ password: formData.password }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to reset password");

      setMessage({
        type: "success",
        text: "Password reset successful! Redirecting to login...",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-box">
        <div className="reset-password-header">
          <h2>Reset Password</h2>
          <p>Enter your new password below</p>
        </div>

        {message.text && (
          <div className={`reset-password-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="reset-password-form-group">
            <label htmlFor="password">New Password</label>
            <div className="reset-password-input-wrapper">
              <Lock size={20} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="reset-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {formData.password && (
              <>
                <div className="password-strength">
                  <div className={`strength-bar ${strength}`}></div>
                </div>
                <div className="password-requirements">
                  <ul>
                    <li className={requirements.length ? 'valid' : 'invalid'}>
                      At least 8 characters
                    </li>
                    <li className={requirements.uppercase ? 'valid' : 'invalid'}>
                      One uppercase letter
                    </li>
                    <li className={requirements.lowercase ? 'valid' : 'invalid'}>
                      One lowercase letter
                    </li>
                    <li className={requirements.number ? 'valid' : 'invalid'}>
                      One number
                    </li>
                    <li className={requirements.special ? 'valid' : 'invalid'}>
                      One special character
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="reset-password-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={`reset-password-input-wrapper ${
              formData.confirmPassword ? 
                (passwordsMatch ? 'match' : 'no-match') : ''
            }`}>
              <Lock size={20} />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="reset-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {formData.confirmPassword && (
              <div className={`password-match-indicator ${
                passwordsMatch ? 'match' : 'no-match'
              }`}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="reset-password-submit"
            disabled={isLoading || !passwordsMatch}
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}