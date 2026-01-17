const axios = require("axios");

async function getWeather(city = "Bangalore") {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

  const { data } = await axios.get(url);

  return {
    city: data.name,
    temp: data.main.temp,
    condition: data.weather[0].main,
    description: data.weather[0].description
  };
}

module.exports = { getWeather };
