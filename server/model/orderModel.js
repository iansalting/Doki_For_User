import mongoose from "mongoose";

const userOrderSchema = new mongoose.Schema({
    users: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending"
    },
    items: [{
        menuItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Menu",
            required: true
        },
        selectedSize: {
            type: String,
            enum: ["Classic", "Deluxe", "Supreme"],
            default: "Classic",
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    bills: {
        total: { type: Number, required: true },
        tax: { type: Number, required: true },
        totalWithTax: { type: Number, required: true }
    },
    payment: {
        type: String,
        enum: ["cashless", "cash"],
        default: "cashless",
        required: true
    },
    paymentDetails: {
        paymentIntentId: { type: String },
        paymentMethodId: { type: String },
        stripeCustomerId: { type: String },
        paymentStatus: {
            type: String,
            enum: ["pending", "succeeded", "failed", "refunded"],
            default: "pending"
        },
        paymentTimestamp: { type: Date }
    },
}, { timestamps: true });

const Order = mongoose.model('Order', userOrderSchema);
export default Order;