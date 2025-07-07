const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const vnpayService = require("./vnpayService");

class OrderService {
  // Tạo đơn hàng từ giỏ hàng
  async createOrderFromCart(userId, shippingAddress, paymentMethod = "vnpay", notes = "") {
    try {
      // Lấy giỏ hàng của user
      const cart = await Cart.findOne({ user_id: userId }).populate("items.product_id");
      
      if (!cart || cart.items.length === 0) {
        throw new Error("Giỏ hàng trống hoặc không tồn tại");
      }

      // Kiểm tra tồn kho và giá sản phẩm
      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = cartItem.product_id;
        
        // Kiểm tra sản phẩm còn tồn tại và active
        if (!product || !product.is_active) {
          throw new Error(`Sản phẩm ${product?.name || 'không xác định'} không còn khả dụng`);
        }

        // Kiểm tra tồn kho
        if (product.stock_quantity < cartItem.quantity) {
          throw new Error(`Sản phẩm ${product.name} chỉ còn ${product.stock_quantity} sản phẩm`);
        }

        // Tính tổng tiền item
        const itemTotal = product.price * cartItem.quantity;
        subtotal += itemTotal;

        orderItems.push({
          product_id: product._id,
          name: product.name,
          price: product.price,
          quantity: cartItem.quantity,
          total: itemTotal,
        });
      }

      // Tính phí ship (có thể customize logic này)
      const shippingFee = this.calculateShippingFee(subtotal, shippingAddress.city);
      const totalAmount = subtotal + shippingFee;

      // Tạo order code
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const orderCode = `GH${timestamp}${random}`;

      // Tạo order mới
      const order = new Order({
        order_code: orderCode,
        user_id: userId,
        items: orderItems,
        subtotal,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        payment_info: {
          method: paymentMethod,
        },
        notes,
      });

      await order.save();

      // Giảm số lượng tồn kho
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(
          item.product_id,
          { $inc: { stock_quantity: -item.quantity } }
        );
      }

      // Xóa giỏ hàng sau khi tạo order thành công
      await Cart.findByIdAndDelete(cart._id);

      return order;
    } catch (error) {
      throw new Error(`Không thể tạo đơn hàng: ${error.message}`);
    }
  }

  // Tạo URL thanh toán VNPay
  async createPaymentUrl(orderId, ipAddr) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Đơn hàng không tồn tại");
      }

      if (order.payment_status === "paid") {
        throw new Error("Đơn hàng đã được thanh toán");
      }

      const paymentUrl = vnpayService.createPaymentUrl(order, ipAddr);
      
      // Cập nhật thông tin payment
      order.payment_info.vnpay_order_info = `Thanh toan don hang ${order.order_code}`;
      await order.save();

      return paymentUrl;
    } catch (error) {
      throw new Error(`Không thể tạo URL thanh toán: ${error.message}`);
    }
  }

  // Xử lý payment return từ VNPay
  async handlePaymentReturn(vnpParams) {
    try {
      // Verify signature
      const isValidSignature = vnpayService.verifyReturnUrl(vnpParams);
      if (!isValidSignature) {
        throw new Error("Chữ ký không hợp lệ");
      }

      const orderCode = vnpParams.vnp_TxnRef;
      const responseCode = vnpParams.vnp_ResponseCode;
      const transactionNo = vnpParams.vnp_TransactionNo;
      const amount = parseInt(vnpParams.vnp_Amount) / 100;

      // Tìm order
      const order = await Order.findOne({ order_code: orderCode });
      if (!order) {
        throw new Error("Đơn hàng không tồn tại");
      }

      // Cập nhật thông tin payment
      order.payment_info.vnpay_transaction_id = transactionNo;
      order.payment_info.vnpay_response_code = responseCode;

      if (responseCode === "00") {
        // Thanh toán thành công
        order.payment_status = "paid";
        order.status = "paid";
        order.payment_info.paid_at = new Date();
        
        // Tính estimated delivery (ví dụ: 3-5 ngày)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 4);
        order.estimated_delivery = deliveryDate;
      } else {
        // Thanh toán thất bại
        order.payment_status = "failed";
        order.status = "cancelled";
        
        // Hoàn lại tồn kho
        await this.restoreInventory(order);
      }

      await order.save();

      return {
        success: responseCode === "00",
        order,
        message: vnpayService.getResponseMessage(responseCode),
      };
    } catch (error) {
      throw new Error(`Lỗi xử lý payment return: ${error.message}`);
    }
  }

  // Xử lý IPN từ VNPay
  async handlePaymentIPN(vnpParams) {
    try {
      const ipnResult = vnpayService.verifyIPN(vnpParams);
      
      if (!ipnResult.isValid) {
        return { RspCode: "97", Message: "Checksum failed" };
      }

      const order = await Order.findOne({ order_code: ipnResult.orderId });
      if (!order) {
        return { RspCode: "01", Message: "Order not found" };
      }

      if (order.payment_status === "paid") {
        return { RspCode: "02", Message: "Order already confirmed" };
      }

      // Cập nhật order status
      if (ipnResult.responseCode === "00") {
        order.payment_status = "paid";
        order.status = "paid";
        order.payment_info.paid_at = new Date();
        order.payment_info.vnpay_transaction_id = ipnResult.transactionNo;
        order.payment_info.vnpay_response_code = ipnResult.responseCode;
        
        await order.save();
        return { RspCode: "00", Message: "Confirm Success" };
      } else {
        order.payment_status = "failed";
        order.status = "cancelled";
        
        // Hoàn lại tồn kho
        await this.restoreInventory(order);
        await order.save();
        
        return { RspCode: "00", Message: "Confirm Success" };
      }
    } catch (error) {
      console.error("IPN Error:", error);
      return { RspCode: "99", Message: "Unknown error" };
    }
  }

  // Lấy danh sách đơn hàng của user
  async getUserOrders(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const orders = await Order.find({ user_id: userId })
        .populate("items.product_id", "name images sku")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      const totalOrders = await Order.countDocuments({ user_id: userId });

      return {
        orders,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalOrders / limit),
          total_items: totalOrders,
        },
      };
    } catch (error) {
      throw new Error(`Không thể lấy danh sách đơn hàng: ${error.message}`);
    }
  }

  // Lấy chi tiết đơn hàng
  async getOrderById(orderId, userId = null) {
    try {
      const query = { _id: orderId };
      if (userId) {
        query.user_id = userId;
      }

      const order = await Order.findOne(query)
        .populate("user_id", "full_name email phone")
        .populate("items.product_id", "name images sku");

      if (!order) {
        throw new Error("Đơn hàng không tồn tại");
      }

      return order;
    } catch (error) {
      throw new Error(`Không thể lấy thông tin đơn hàng: ${error.message}`);
    }
  }

  // Hủy đơn hàng
  async cancelOrder(orderId, userId, reason) {
    try {
      const order = await Order.findOne({ _id: orderId, user_id: userId });
      
      if (!order) {
        throw new Error("Đơn hàng không tồn tại");
      }

      if (!["pending", "paid"].includes(order.status)) {
        throw new Error("Không thể hủy đơn hàng ở trạng thái này");
      }

      order.status = "cancelled";
      order.notes = order.notes ? `${order.notes}\nLý do hủy: ${reason}` : `Lý do hủy: ${reason}`;

      // Hoàn lại tồn kho
      await this.restoreInventory(order);
      
      await order.save();
      return order;
    } catch (error) {
      throw new Error(`Không thể hủy đơn hàng: ${error.message}`);
    }
  }

  // Helper methods
  calculateShippingFee(subtotal, city) {
    // Logic tính phí ship đơn giản
    if (subtotal >= 500000) return 0; // Free ship từ 500k
    
    const cityShippingRates = {
      "Ho Chi Minh": 25000,
      "Hanoi": 25000,
      "Da Nang": 30000,
    };

    return cityShippingRates[city] || 35000; // Default 35k cho tỉnh khác
  }

  async restoreInventory(order) {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product_id,
        { $inc: { stock_quantity: item.quantity } }
      );
    }
  }
}

module.exports = new OrderService(); 