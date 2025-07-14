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
import { initSocket } from "./socket.js";

dotenv.config();

const app = express();

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

dbConnection();

app.use("/user", user);
app.use("/api/cart", cartRoute);
app.use("/api/order", orderRoute);
app.use("/api/menu", menuRoutes);


const server = http.createServer(app);
initSocket(server);

const PORT = config.port;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
