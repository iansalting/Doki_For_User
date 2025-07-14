import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './register.css'

export default function Register() {
  const [formData, setFormData] = useState({ userName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const navigate = useNavigate();

  // Password validation function (same as reset password)
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
  const isPasswordValid = Object.values(requirements).every(Boolean);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Enhanced password validation
    if (!isPasswordValid) {
      showMessage('error', 'Password must meet all requirements');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/user/register", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setUserEmail(formData.email);
        setRegistrationComplete(true);
        showMessage('success', 'Registration successful! Please check your email for verification.');
        setFormData({ userName: '', email: '', password: '' });
      } else {
        showMessage('error', data.message || 'Registration failed');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const response = await fetch("http://localhost:5000/user/resend-verification", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', 'Verification email sent successfully!');
      } else {
        showMessage('error', data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const MessageAlert = ({ message }) =>
    message.text ? (
      <div className={`message-alert ${message.type}`}>
        {message.text}
      </div>
    ) : null;

  // Show verification screen after successful registration
  if (registrationComplete) {
    return (
      <div className="register-page">
        <div className="register-box">
          <div className="register-header">
            <button className="back-button" onClick={() => navigate('/')}>
              <ArrowLeft size={20} />
            </button>
            <h1>Check Your Email</h1>
            <p>We've sent a verification link to {userEmail}</p>
          </div>

          <MessageAlert message={message} />

          <div className="verification-content">
            <div className="verification-icon">
              <Mail size={64} style={{ color: '#4CAF50', margin: '20px auto', display: 'block' }} />
            </div>
            
            <div className="verification-info">
              <h3>Verify Your Email Address</h3>
              <p>
                Click the verification link in your email to activate your account. 
                The link will expire in 1 hour.
              </p>
              <p>
                <strong>Didn't receive the email?</strong> Check your spam folder or 
                request a new verification email.
              </p>
            </div>

            <div className="verification-actions">
              <button 
                className="submit-button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                style={{ marginBottom: '10px' }}
              >
                {resendLoading ? (
                  <>
                    <RefreshCw size={16} style={{ marginRight: '5px', animation: 'spin 1s linear infinite' }} />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </button>
              
              <button 
                className="sign-in-button"
                onClick={() => navigate('/login')}
                style={{ marginBottom: '10px' }}
              >
                Go to Login
              </button>

              <button 
                className="sign-in-button"
                onClick={() => {
                  setRegistrationComplete(false);
                  setMessage({ type: '', text: '' });
                  setUserEmail('');
                }}
              >
                Back to Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-box">
        <div className="register-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <h1>Create Account</h1>
          <p>Join us today</p>
        </div>

        <MessageAlert message={message} />

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div className="input-wrapper">
              <User size={20} />
              <input
                type="text"
                required
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <Mail size={20} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {/* Password strength indicator and requirements */}
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

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading || !isPasswordValid}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="register-footer">
            <span>Already have an account? </span>
            <button 
              type="button" 
              className="sign-in-button"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}