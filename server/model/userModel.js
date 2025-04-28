import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    role: {
       type: String,
       default:"user" 
    },
    cart: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu' },
            quantity: { type: Number, default: 1 },
        },
    ]
},{
    timestamps: true
});

const user = mongoose.model("User", userSchema);
export default user;