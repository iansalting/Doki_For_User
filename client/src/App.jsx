import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Order, Cart, Login, Register } from "../pages/index";

function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/order" element={<Order />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
