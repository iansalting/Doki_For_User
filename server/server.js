import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import user from  "./routes/userRoute.js";
import config from "./config/config.js";
import dbConnection from "./config/db.js";
import cartRoute from "./routes/cartRoute.js";
import orderRoute from "./routes/orderRoute.js";
import menuRoutes from "./routes/menuRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config()
app.use(bodyParser.urlencoded({extended: true}));
dbConnection()

app.use("/user", user);
app.use("/api/cart", cartRoute);
app.use("/api/order", orderRoute);
app.use("/api/menu", menuRoutes);



const PORT = config.port;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));