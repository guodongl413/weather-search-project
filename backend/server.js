const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 从环境变量中获取 API 密钥
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const TOMORROW_API_KEY = process.env.TOMORROW_API_KEY;

// 验证必要的环境变量
if (!GOOGLE_API_KEY) {
  console.error('Error: GOOGLE_API_KEY is not defined in environment variables.');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

if (!TOMORROW_API_KEY) {
  console.error('Error: TOMORROW_API_KEY is not defined in environment variables.');
  process.exit(1);
}

// 中间件
app.use(cors());
app.use(express.json());

// 基本路由
app.get('/', (req, res) => {
  res.send('Weather Search API is running');
});

// Autocomplete 路由
app.get('/api/autocomplete', async (req, res) => {
  const { input } = req.query;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&types=(cities)&key=${GOOGLE_API_KEY}`;
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching autocomplete data:', error.message);
    res.status(500).json({ error: 'Error fetching autocomplete data.' });
  }
});

// Fetch weather data helper function
async function fetchWeatherData(latitude, longitude, timesteps, fields) {
  const url = "https://api.tomorrow.io/v4/timelines";
  const params = {
    location: `${latitude},${longitude}`,
    fields: fields,
    units: "imperial",
    timesteps: timesteps,
    timezone: "America/Los_Angeles"
  };
  const headers = { "apikey": TOMORROW_API_KEY };

  try {
    const response = await axios.get(url, { headers, params });
    console.log(`Request URL: ${response.config.url}`);
    console.log(`Status Code: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${timesteps} weather data:`, error.message);
    return null;
  }
}

// Search 路由
app.post('/api/search', async (req, res) => {
  const { street, city, state, useCurrentLocation, latitude, longitude } = req.body;

  let lat, lon;

  if (useCurrentLocation) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Latitude and Longitude are required when using current location.' });
    }
    lat = latitude;
    lon = longitude;
  } else {
    if (!street || !city || !state) {
      return res.status(400).json({ error: 'Street, City, and State are required unless using current location.' });
    }

    const address = `${street}, ${city}, ${state}`;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;

    try {
      const geocodeResponse = await axios.get(geocodeUrl);
      if (geocodeResponse.data.status !== 'OK' || geocodeResponse.data.results.length === 0) {
        return res.status(400).json({ error: 'Geocoding failed. Please check the address and try again.' });
      }
      lat = geocodeResponse.data.results[0].geometry.location.lat;
      lon = geocodeResponse.data.results[0].geometry.location.lng;
    } catch (error) {
      console.error('Geocoding API error:', error.message);
      return res.status(500).json({ error: 'Failed to geocode address.' });
    }
  }

  // 定义需要的字段
  const dailyFields = [
    "temperature", "temperatureApparent", "temperatureMin", "temperatureMax", "windSpeed", "weatherCode"
  ];
  const hourlyFields = [
    "temperature", "windSpeed", "windDirection", "humidity", "pressureSeaLevel"
  ];

  // 获取 daily 数据
  const dailyData = await fetchWeatherData(lat, lon, "1d", dailyFields.join(","));
  // 获取 hourly 数据
  const hourlyData = await fetchWeatherData(lat, lon, "1h", hourlyFields.join(","));

  if (!dailyData || !hourlyData) {
    return res.status(500).json({ error: 'Failed to retrieve weather data.' });
  }

  res.json({ daily: dailyData, hourly: hourlyData });
});

// 连接 MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully');

  // 启动服务器
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
