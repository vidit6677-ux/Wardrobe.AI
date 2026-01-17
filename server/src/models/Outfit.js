const mongoose = require("mongoose");

const outfitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  occasion: {
    type: String,
    required: true
  },

  weather: {
    type: String,
    required: true
  },

  items: [
    {
      clothingItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClothingItem"
      },
      role: {
        type: String, 
        required: true
      }
    }
  ],

  aiReason: String,

  score: {
    type: Number,
    min: 0,
    max: 1
  },

  isWishlisted: {
    type: Boolean,
    default: false
  },

  wornCount: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

module.exports = mongoose.model("Outfit", outfitSchema);
