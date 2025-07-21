import mongoose from "mongoose";

const MenuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "ramen",
        "riceBowls",
        "drinks",
        "sides",
        "toppings",
        "desserts",
        "appetizers",
        "specials",
      ],
    },
    available: {
      type: Boolean,
      default: true,
    },

    image: {
      type: String,
      trim: true,
    },
    imageAlt: {
      type: String,
      trim: true,
      // Alt text for accessibility (e.g., "Tonkotsu Ramen")
    },
    sizes: [
      {
        label: {
          type: String,
          enum: ["Classic", "Deluxe", "Supreme"],
          default: "Classic",
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        ingredients: [
          {
            ingredient: {
              type: mongoose.Schema.ObjectId,
              ref: "Ingredient",
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
            },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const MenuItem = mongoose.model("Menu", MenuItemSchema);
export default MenuItem;