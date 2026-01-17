const mongoose = require("mongoose");

const clothingItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  imageUrl: {
    type: String,
    required: true
  },

  category: {
    main: {
      type: String,
      enum: ["top", "bottom", "footwear", "outerwear", "accessory"],
      required: true
    },
    sub: {
      type: String,
      required: true
    }
  },

  color: {
    type: [String],
    required: true
  },

  pattern: String,

  fit: {
    type: String,
    enum: ["slim", "regular", "oversized"]
  },

  style: {
    type: [String] 
  },

  season: {
    type: [String] 
  },

  formality: {
    type: Number,
    min: 1,
    max: 5
  },

  embedding: {
    type: [Number], 
    default: []
  }

}, { timestamps: true });

module.exports = mongoose.model("ClothingItem", clothingItemSchema);
