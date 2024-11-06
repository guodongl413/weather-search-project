const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');


// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 硬编码的模拟数据
const mockAddressData = {
  street: "123 Main St",
  city: "Los Angeles",
  state: "CA"
};

const mockCurrentLocationData = {
  useCurrentLocation: true,
  latitude: 34.0030,
  longitude: -118.2863
};

// 基本路由
app.get('/', (req, res) => {
  res.send('Weather Search API is running');
});

app.get('/api/autocomplete', async (req, res) => {
  const { input } = req.query;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&types=(cities)&key=AIzaSyCXW5z1VlxxIPn3yuNBWN3jF2PqokEE5O8`;
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).send('Error fetching data');
  }
});

// 连接 MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('MongoDB connected successfully');
  
  // 启动服务器
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
