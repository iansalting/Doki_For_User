import React, { useState } from 'react';
import './forgotPassword.css';

export default function ForgetPassword() {
  const [formData, setFormData] = useState({ email: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/user/forget-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Something went wrong");

      setMessage({ type: 'success', text: data.message });
    } catch (error) {
      console.error("Error:", error.message);
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="container">
      <div className="box">
        <h2>Forget Password</h2>
        {message.text && (
          <p className={`message ${message.type}`}>{message.text}</p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => setFormData({ email: e.target.value })}
            required
          />
          <button type="submit">Send Reset Link</button>
        </form>
      </div>
    </div>
  );
}