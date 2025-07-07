const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
});

const shippingAddressSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  postal_code: {
    type: String,
  },
  notes: {
    type: String,
  },
});

const paymentInfoSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["vnpay", "cod"],
    required: true,
  },
  vnpay_transaction_id: {
    type: String,
  },
  vnpay_order_info: {
    type: String,
  },
  vnpay_response_code: {
    type: String,
  },
  paid_at: {
    type: Date,
  },
});

const orderSchema = new mongoose.Schema(
  {
    order_code: {
      type: String,
      required: true,
      unique: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping_fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",       // Đang chờ thanh toán
        "paid",          // Đã thanh toán
        "processing",    // Đang xử lý
        "shipping",      // Đang giao hàng
        "delivered",     // Đã giao hàng
        "cancelled",     // Đã hủy
        "refunded"       // Đã hoàn tiền
      ],
      default: "pending",
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    shipping_address: {
      type: shippingAddressSchema,
      required: true,
    },
    payment_info: paymentInfoSchema,
    notes: {
      type: String,
    },
    ordered_at: {
      type: Date,
      default: Date.now,
    },
    estimated_delivery: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo order code tự động
orderSchema.pre("save", function (next) {
  if (this.isNew && !this.order_code) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    this.order_code = `GH${timestamp}${random}`;
  }
  next();
});

// Index cho tìm kiếm
orderSchema.index({ user_id: 1, created_at: -1 });
orderSchema.index({ order_code: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payment_status: 1 });

module.exports = mongoose.model("Order", orderSchema); 