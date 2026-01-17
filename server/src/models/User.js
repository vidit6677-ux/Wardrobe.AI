const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },

  gender: {
    type: String,
    enum: ["male", "female", "other"]
  },

  bodyType: {
    type: String,
    enum: ["slim", "average", "athletic", "heavy"]
  },

  stylePreference: {
    type: [String], 
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
