import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/navBar";
import axios from "axios";
import {
  Order,
  Cart,
  Login,
  Register,
  VerifyEmail,
  ResetPassword,
  ForgotPassword,
} from "../pages/index";

function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navbarRoutes = ["/orders", "/cart"];

  // Check auth status on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/user/data", { withCredentials: true });
        setUser(res.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const shouldShowNavbar =
    user && navbarRoutes.some((route) => location.pathname.startsWith(route));

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {shouldShowNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />c 
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/orders" element={<Order />} />
        <Route path="/cart" element={<Cart />} />
      </Routes>
    </>
  );
}

export default App;
