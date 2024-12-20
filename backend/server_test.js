const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs'); // 新增

const Favorite = require('./models/Favorite');

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

// 读取本地的JSON文件 (只需读取一次，避免重复读取)
let localWeatherData;
try {
  const data = fs.readFileSync('./Weatherdata.json', 'utf8'); // 确保路径正确
  localWeatherData = JSON.parse(data);
  console.log('Local weather data loaded successfully');
} catch (error) {
  console.error('Error loading local weather data:', error.message);
}

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

// Search 路由 - 支持 GET 请求，通过查询参数获取位置数据
app.get('/api/search', async (req, res) => {
  const { street, city, state, useCurrentLocation, latitude, longitude } = req.query;

  let lat, lon;

  if (useCurrentLocation === 'true') {
    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({ error: 'Latitude and Longitude are required when using current location.' });
    }
    lat = parseFloat(latitude);
    lon = parseFloat(longitude);
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
  // const dailyData = await fetchWeatherData(lat, lon, "1d", dailyFields.join(","));
  const dailyData = localWeatherData.daily;
  // 获取 hourly 数据
  // const hourlyData = await fetchWeatherData(lat, lon, "1h", hourlyFields.join(","));
  const hourlyData = localWeatherData.hourly;

  if (!dailyData || !hourlyData) {
    return res.status(500).json({ error: 'Failed to retrieve weather data.' });
  }

  res.json({ daily: dailyData, hourly: hourlyData });
});

// 连接 MongoDB
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'weatherapp',  // 指定数据库名称
  // useNewUrlParser: true,
  // useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully');

// 添加收藏城市
app.post('/api/favorites', async (req, res) => {

  console.log('Received POST request at /api/favorites');
  console.log('Request Body:', req.body);

  const { city, state } = req.body;

  // 验证参数
  if (!city || !state) {
    return res.status(400).json({ error: 'City and State are required.' });
  }

  try {
    // 检查是否已存在
    const existingFavorite = await Favorite.findOne({ city, state });
    if (existingFavorite) {
      return res.status(409).json({ message: 'City is already in favorites.' });
    }

    // 添加到数据库
    const newFavorite = new Favorite({ city, state });
    await newFavorite.save();

    return res.status(201).json({ message: 'City added to favorites.', data: newFavorite });
  } catch (error) {
    console.error('Error adding to favorites:', error.message);
    return res.status(500).json({ error: 'Failed to add city to favorites.' });
  }
});

// 删除收藏城市
app.delete('/api/favorites/:city', async (req, res) => {
  const { city } = req.params;

  try {
    const result = await Favorite.deleteOne({ city });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'City not found in favorites.' });
    }

    return res.status(200).json({ message: 'City removed from favorites.' });
  } catch (error) {
    console.error('Error removing city:', error.message);
    return res.status(500).json({ error: 'Failed to remove city from favorites.' });
  }
});

// 获取所有收藏城市
app.get('/api/favorites', async (req, res) => {
  try {
    const favorites = await Favorite.find(); // 从数据库中查询所有收藏的城市
    return res.status(200).json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error.message);
    return res.status(500).json({ error: 'Failed to fetch favorites.' });
  }
});

  // 启动服务器
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
