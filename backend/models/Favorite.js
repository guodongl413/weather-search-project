const mongoose = require('mongoose');

// 定义收藏城市的 Schema
const FavoriteSchema = new mongoose.Schema({
  city: { type: String, required: true },
  state: { type: String, required: true },
  createdAt: { type: Date, default: Date.now } // 收藏时间
});

// 导出模型
module.exports = mongoose.model('Favorite', FavoriteSchema);
