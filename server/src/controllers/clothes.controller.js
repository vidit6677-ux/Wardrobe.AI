const ClothingItem = require("../models/ClothingItem");

exports.uploadCloth = async (req, res) => {
  try {
    const {
      imageUrl
    } = req.body;

    const aiData = {
      category: { main: "top", sub: "shirt" },
      color: ["white"],
      pattern: "solid",
      fit: "regular",
      style: ["casual"],
      season: ["summer"],
      formality: 3,
      embedding: []
    };

    const newItem = new ClothingItem({
      userId: req.user.id,
      imageUrl,
      ...aiData
    });

    await newItem.save();

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWardrobe = async (req, res) => {
  try {
    const items = await ClothingItem.find({ userId: req.user.id });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
