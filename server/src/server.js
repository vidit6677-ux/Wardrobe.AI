require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const cors = require("cors");

app.use(cors({
  origin: "http://localhost:3001",
  credentials: true
}));


// console.log("Weather key:", process.env.OPENWEATHER_API_KEY);


connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
