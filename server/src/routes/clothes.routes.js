const express = require("express");
const router = express.Router();
const authRequired = require("../middleware/authRequired");
const axios = require("axios");
const ClothingItem = require("../models/ClothingItem");
const upload = require("../middleware/upload");

router.get("/", authRequired, async (req, res) => {
  try {
    const items = await ClothingItem.find({ userId: req.user.id });
    res.json(items);
  } catch (error) {
    console.error("Get clothes error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/upload", authRequired, upload.single("image"), async (req, res) => {
  try {
    const imageUrl = req.file.path;

    const visionResponse = await axios.post("http://127.0.0.1:8000/analyze", {
      image_url: imageUrl,
    });

    const aiData = visionResponse.data;

    const sub = aiData?.category?.sub;
    if (["jacket", "coat"].includes(sub)) {
      aiData.category.main = "outerwear";
    }

    const clothing = new ClothingItem({
      userId: req.user.id,
      imageUrl,
      category: aiData.category,
      color: aiData.color,
      style: aiData.style,
      season: aiData.season,
      embedding: aiData.embedding,
    });

    await clothing.save();
    res.json(clothing);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", authRequired, async (req, res) => {
  try {
    const { category, color, style, season } = req.body;

    const item = await ClothingItem.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found or unauthorized" });
    }

    if (category) item.category = category;
    if (color) item.color = color;
    if (style) item.style = style;
    if (season) item.season = season;

    await item.save();
    res.json(item);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const item = await ClothingItem.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found or unauthorized" });
    }

    await ClothingItem.deleteOne({ _id: req.params.id });
    
    res.json({ message: "Item deleted successfully", id: req.params.id });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;