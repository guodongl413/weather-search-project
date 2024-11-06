const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

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
