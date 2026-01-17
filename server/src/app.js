const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const clothesRoutes = require("./routes/clothes.routes");
const outfitRoutes = require("./routes/outfit.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3001",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Wardrobe AI backend running" });
});

app.get("/test-weather", async (req, res) => {
  const { getWeather } = require("./services/weather.service");
  try {
    const data = await getWeather("London");
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use("/api/clothes", clothesRoutes);
app.use("/api/outfits", outfitRoutes);

module.exports = app;