const express = require("express");
const router = express.Router();
const authRequired = require("../middleware/authRequired");
const { recommendOutfits } = require("../controllers/outfit.controller");

router.get("/recommend", authRequired, recommendOutfits);

module.exports = router;