const orderService = require("../services/orderService");

// @desc    Checkout - tạo đơn hàng từ giỏ hàng
// @route   POST /api/orders/checkout
// @access  Private
const checkout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shipping_address, payment_method = "vnpay", notes = "" } = req.body;

    // Validate shipping address
    const requiredFields = ["full_name", "phone", "address", "city"];
    for (const field of requiredFields) {
      if (!shipping_address[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} là bắt buộc`,
        });
      }
    }

    const order = await orderService.createOrderFromCart(
      userId,
      shipping_address,
      payment_method,
      notes
    );

    res.status(201).json({
      success: true,
      data: order,
      message: "Đơn hàng đã được tạo thành công",
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Tạo URL thanh toán VNPay
// @route   POST /api/orders/:id/payment
// @access  Private
const createPaymentUrl = async (req, res) => {
  try {
    const orderId = req.params.id;
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip ||
      "127.0.0.1";

    const paymentUrl = await orderService.createPaymentUrl(orderId, ipAddr);

    res.json({
      success: true,
      data: {
        payment_url: paymentUrl,
      },
      message: "URL thanh toán đã được tạo",
    });
  } catch (error) {
    console.error("Create payment URL error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Xử lý payment return từ VNPay
// @route   GET /api/orders/vnpay-return
// @access  Public
const handlePaymentReturn = async (req, res) => {
  try {
    const vnpParams = req.query;
    const result = await orderService.handlePaymentReturn(vnpParams);

    if (result.success) {
      // Redirect đến trang success của frontend
      const frontendSuccessUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5000"
      }/order-success?orderId=${result.order._id}`;
      return res.redirect(frontendSuccessUrl);
    } else {
      // Redirect đến trang failed của frontend
      const frontendFailedUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5000"
      }/order-failed?message=${encodeURIComponent(result.message)}`;
      return res.redirect(frontendFailedUrl);
    }
  } catch (error) {
    console.error("Payment return error:", error);
    const frontendErrorUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5000"
    }/order-failed?message=${encodeURIComponent("Lỗi xử lý thanh toán")}`;
    return res.redirect(frontendErrorUrl);
  }
};

// @desc    Xử lý IPN từ VNPay
// @route   POST /api/orders/vnpay-ipn
// @access  Public
const handlePaymentIPN = async (req, res) => {
  try {
    const vnpParams = req.query;
    const result = await orderService.handlePaymentIPN(vnpParams);

    res.json(result);
  } catch (error) {
    console.error("Payment IPN error:", error);
    res.json({ RspCode: "99", Message: "Unknown error" });
  }
};

// @desc    Lấy danh sách đơn hàng của user
// @route   GET /api/orders
// @access  Private
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await orderService.getUserOrders(userId, page, limit);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Lấy chi tiết đơn hàng
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.role === "admin" ? null : req.user.id;

    const order = await orderService.getOrderById(orderId, userId);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Hủy đơn hàng
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const { reason = "Khách hàng yêu cầu hủy" } = req.body;

    const order = await orderService.cancelOrder(orderId, userId, reason);

    res.json({
      success: true,
      data: order,
      message: "Đơn hàng đã được hủy thành công",
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Admin - Lấy tất cả đơn hàng
// @route   GET /api/orders/admin/all
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const skip = (page - 1) * limit;
    const Order = require("../models/Order");

    let query = {};
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate("user_id", "full_name email phone")
      .populate("items.product_id", "name sku")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalOrders / limit),
        total_items: totalOrders,
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Admin - Cập nhật trạng thái đơn hàng
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "paid",
      "processing",
      "shipping",
      "delivered",
      "cancelled",
      "refunded",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Trạng thái không hợp lệ",
      });
    }

    const Order = require("../models/Order");
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate("user_id", "full_name email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Đơn hàng không tồn tại",
      });
    }

    res.json({
      success: true,
      data: order,
      message: "Trạng thái đơn hàng đã được cập nhật",
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  checkout,
  createPaymentUrl,
  handlePaymentReturn,
  handlePaymentIPN,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
