const axios = require("axios");

exports.analyzeImage = async (imageUrl) => {
  const response = await axios.post("http://127.0.0.1:8000/analyze", {
    imageUrl
  });

  return response.data; 
};
