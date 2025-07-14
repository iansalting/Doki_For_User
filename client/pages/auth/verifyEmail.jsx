import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './verifyEmail.css';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(null);
  const hasRun = useRef(false); 

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || hasRun.current) return;
      hasRun.current = true;

      try {
        const response = await axios.get(`http://localhost:5000/user/verifyEmail/${token}`);
        setMessage(response.data.message);
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } catch (error) {
        const errorMsg = error?.response?.data?.message || 'Invalid or expired token';
        setMessage(errorMsg);
        setSuccess(false);
        console.error("Verification error:", error);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="verify-email-container">
      <h2>Email Verification</h2>
      {success === null ? (
        <p>Verifying...</p>
      ) : success ? (
        <p className="success">{message}</p>
      ) : (
        <p className="error">{message}</p>
      )}
    </div>
  );
}
