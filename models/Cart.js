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
    default: null,
  },
  session_id: {
    type: String,
    default: null,
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

// Ensure either user_id or session_id is provided (not both null)
CartSchema.index({ user_id: 1 }, { sparse: true, unique: true });
CartSchema.index({ session_id: 1 }, { sparse: true, unique: true });

// Calculate totals before saving
CartSchema.pre('save', function() {
  if (!this.user_id && !this.session_id) {
    throw new Error('Either user_id or session_id must be provided');
  }
  this.total_items = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.total_amount = this.items.reduce((sum, item) => sum + item.total, 0);
});

module.exports = mongoose.model("Cart", CartSchema); 