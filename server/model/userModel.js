import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    cart: {
      type: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Menu",
            required: true,
          },
          quantity: {
            type: Number,
            default: 1,
            min: [1, "Quantity must be at least 1"],
          },
          selectedSize: {
            type: String,
            enum: ["Classic", "Deluxe", "Supreme"],
            default: "Classic",
            required: true,
          },
        },
      ],
      validate: {
        validator: function (val) {
          return val.length <= 20;
        },
        message: "Cart can contain a maximum of 20 items",
      },
    },

    resetPasswordToken: String,
    resetPasswordExpires: Date
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("user", userSchema);
export default User; 