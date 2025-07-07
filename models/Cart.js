const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Vui lòng chọn sản phẩm"],
  },
  quantity: {
    type: Number,
    required: [true, "Vui lòng nhập số lượng"],
    min: [1, "Số lượng phải lớn hơn 0"],
    default: 1,
  },
  price: {
    type: Number,
    required: [true, "Giá sản phẩm là bắt buộc"],
  },
  total: {
    type: Number,
    required: true,
  },
}, {
  _id: false
});

const CartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID là bắt buộc"],
    unique: true,
  },
  items: [CartItemSchema],
  total_items: {
    type: Number,
    default: 0,
  },
  total_amount: {
    type: Number,
    default: 0,
  },
}, {
  collection: "carts",
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

// Calculate totals before saving
CartSchema.pre('save', function() {
  this.total_items = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.total_amount = this.items.reduce((sum, item) => sum + item.total, 0);
});

module.exports = mongoose.model("Cart", CartSchema); 