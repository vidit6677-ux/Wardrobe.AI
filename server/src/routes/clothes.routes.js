const express = require("express");
const router = express.Router();
const authRequired = require("../middleware/authRequired");
const axios = require("axios");
const ClothingItem = require("../models/ClothingItem");
const upload = require("../middleware/upload");

/**
 * IMPORTANT:
 * Multer/Cloudinary errors can happen BEFORE your route handler runs.
 * This error middleware will return JSON instead of an unhelpful 500.
 */
function uploadErrorHandler(err, _req, res, next) {
  if (!err) return next();
  console.error("Multer/Upload error:", err);
  return res.status(400).json({ error: err.message || "Upload error" });
}

router.get("/", authRequired, async (req, res) => {
  try {
    const items = await ClothingItem.find({ userId: req.user.id });
    res.json(items);
  } catch (error) {
    console.error("Get clothes error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/upload",
  authRequired,
  upload.single("image"),
  uploadErrorHandler,
  async (req, res) => {
    try {
      if (!req.file?.path) {
        return res.status(400).json({ error: "Image upload failed (no file received)" });
      }

      const imageUrl = req.file.path;

      console.log("UPLOAD: file received", {
        originalname: req.file?.originalname,
        mimetype: req.file?.mimetype,
        size: req.file?.size,
        path: req.file?.path,
      });

      // Call Vision AI safely (do not fail upload if AI is down)
      let aiData;
      try {
        const visionResponse = await axios.post("http://127.0.0.1:8000/analyze", {
          image_url: imageUrl, // ai-service expects this
          imageUrl,            // keep for compatibility
        });
        aiData = visionResponse.data;
      } catch (e) {
        console.error("Vision service failed:", e?.message);
        console.error("Vision service status:", e?.response?.status);
        console.error("Vision service data:", e?.response?.data);

        aiData = {
          category: { main: "top", sub: "other" },
          color: ["unknown"],
          style: [],
          season: [],
          embedding: [],
        };
      }

      // Normalize aiData -> schema-safe values
      const allowedMains = ["top", "bottom", "footwear", "outerwear", "accessory"];

      const sub =
        typeof aiData?.category?.sub === "string" && aiData.category.sub.trim()
          ? aiData.category.sub.trim().toLowerCase()
          : "other";

      let main = allowedMains.includes(aiData?.category?.main) ? aiData.category.main : "top";

      // map outerwear subs
      if (["jacket", "coat"].includes(sub)) {
        main = "outerwear";
      }

      const color =
        Array.isArray(aiData?.color) && aiData.color.length
          ? aiData.color.map((c) => String(c).toLowerCase())
          : ["unknown"];

      const style = Array.isArray(aiData?.style) ? aiData.style.map(String) : [];
      const season = Array.isArray(aiData?.season) ? aiData.season.map(String) : [];

      const embedding = Array.isArray(aiData?.embedding)
        ? aiData.embedding.map((n) => Number(n)).filter((n) => Number.isFinite(n))
        : [];

      const clothing = new ClothingItem({
        userId: req.user.id,
        imageUrl,
        category: { main, sub },
        color,
        style,
        season,
        embedding,
      });

      await clothing.save();
      return res.json(clothing);
    } catch (error) {
      console.error("Upload error message:", error?.message);
      console.error("Upload error name:", error?.name);
      console.error("Upload error stack:", error?.stack);

      if (error?.name === "ValidationError") {
        console.error("ValidationError details:", error?.errors);
        return res.status(400).json({ error: error.message, details: error.errors });
      }

      return res.status(500).json({ error: error?.message || "Upload failed" });
    }
  }
);

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
      userId: req.user.id,
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found or unauthorized" });
    }

    await ClothingItem.deleteOne({ _id: req.params.id });
    return res.json({ message: "Item deleted successfully", id: req.params.id });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: error.message || "Delete failed" });
  }
});

module.exports = router;