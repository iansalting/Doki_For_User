import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import user from "./routes/userRoute.js";
import config from "./config/config.js";
import dbConnection from "./config/db.js";
import cartRoute from "./routes/cartRoute.js";
import orderRoute from "./routes/orderRoute.js";
import menuRoutes from "./routes/menuRoutes.js";
import cookieParser from "cookie-parser";
import http from "http";
import path from "path";
import { initSocket } from "./socket.js";

dotenv.config();

const app = express();

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
// REPLACE your existing static file serving with this optimized version:
app.use(
  "/uploads",
  express.static("uploads", {
    maxAge: "1y", // Cache for 1 year
    etag: true, // Enable ETags for better caching
    lastModified: true, // Enable Last-Modified headers
    immutable: true, // Tell browsers files won't change
    setHeaders: (res, path) => {
      // Add additional performance headers
      if (
        path.endsWith(".jpg") ||
        path.endsWith(".jpeg") ||
        path.endsWith(".png") ||
        path.endsWith(".webp")
      ) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
    },
  })
);

// Add compression middleware for better performance
import compression from "compression";
app.use(
  compression({
    filter: (req, res) => {
      // Don't compress if the client doesn't support it
      if (req.headers["x-no-compression"]) {
        return false;
      }
      // Compress everything else
      return compression.filter(req, res);
    },
    level: 6, // Good balance between compression and speed
    threshold: 1024, // Only compress files larger than 1KB
  })
);

dbConnection();

app.use("/user", user);
app.use("/api/cart", cartRoute);
app.use("/api/order", orderRoute);
app.use("/api/menu", menuRoutes);

const server = http.createServer(app);
initSocket(server);

const PORT = config.port;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
