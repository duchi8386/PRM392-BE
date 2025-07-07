const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Vui lòng nhập tên danh mục"],
    unique: true,
    trim: true,
  },
  description: String,
  image_url: String,
  is_active: { type: Boolean, default: true },
}, {
  collection: "categories", // Đổi từ "ecommerce_categories" thành "categories"
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

module.exports = mongoose.model("Category", CategorySchema); // Đổi từ "EcommerceCategory" thành "Category" 