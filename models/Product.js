const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vui lòng nhập tên sản phẩm"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Vui lòng nhập mô tả sản phẩm"],
    },
    price: {
      type: Number,
      required: [true, "Vui lòng nhập giá sản phẩm"],
      min: 0,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Vui lòng chọn danh mục"],
    },
    images: [
      {
        url: String,
        is_primary: { type: Boolean, default: false },
      },
    ],
    stock_quantity: {
      type: Number,
      required: [true, "Vui lòng nhập số lượng tồn kho"],
      min: 0,
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      required: [true, "Vui lòng nhập mã sản phẩm"],
    },
    is_active: { type: Boolean, default: true },
    is_featured: { type: Boolean, default: false },
  },
  {
    collection: "products",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Product", ProductSchema); 