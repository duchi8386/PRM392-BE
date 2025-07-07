const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const orderController = require("../controllers/orderController");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and payment processing
 */

/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     summary: Checkout - Create order from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipping_address
 *             properties:
 *               shipping_address:
 *                 type: object
 *                 required:
 *                   - full_name
 *                   - phone
 *                   - address
 *                   - city
 *                 properties:
 *                   full_name:
 *                     type: string
 *                     example: "Nguyễn Văn A"
 *                   phone:
 *                     type: string
 *                     example: "0901234567"
 *                   address:
 *                     type: string
 *                     example: "123 Đường ABC, Quận 1"
 *                   city:
 *                     type: string
 *                     example: "Ho Chi Minh"
 *                   postal_code:
 *                     type: string
 *                     example: "70000"
 *                   notes:
 *                     type: string
 *                     example: "Giao hàng buổi chiều"
 *               payment_method:
 *                 type: string
 *                 enum: [vnpay, cod]
 *                 default: "vnpay"
 *                 example: "vnpay"
 *               notes:
 *                 type: string
 *                 example: "Ghi chú đơn hàng"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Đơn hàng đã được tạo thành công"
 *       400:
 *         description: Bad request - Cart empty or validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/checkout", protect, orderController.checkout);

/**
 * @swagger
 * /api/orders/{id}/payment:
 *   post:
 *     summary: Create VNPay payment URL
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment_url:
 *                       type: string
 *                       format: uri
 *                       example: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
 *                 message:
 *                   type: string
 *                   example: "URL thanh toán đã được tạo"
 *       400:
 *         description: Bad request - Order not found or already paid
 *       401:
 *         description: Unauthorized
 */
router.post("/:id/payment", protect, orderController.createPaymentUrl);

/**
 * @swagger
 * /api/orders/vnpay-return:
 *   get:
 *     summary: Handle VNPay payment return (callback from VNPay)
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: vnp_Amount
 *         schema:
 *           type: string
 *         description: Payment amount from VNPay
 *       - in: query
 *         name: vnp_BankCode
 *         schema:
 *           type: string
 *         description: Bank code from VNPay
 *       - in: query
 *         name: vnp_ResponseCode
 *         schema:
 *           type: string
 *         description: Response code from VNPay
 *       - in: query
 *         name: vnp_TxnRef
 *         schema:
 *           type: string
 *         description: Order code reference
 *       - in: query
 *         name: vnp_SecureHash
 *         schema:
 *           type: string
 *         description: Security hash from VNPay
 *     responses:
 *       302:
 *         description: Redirect to frontend success/failed page
 */
router.get("/vnpay-return", orderController.handlePaymentReturn);

/**
 * @swagger
 * /api/orders/vnpay-ipn:
 *   post:
 *     summary: Handle VNPay IPN (Instant Payment Notification)
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: vnp_Amount
 *         schema:
 *           type: string
 *         description: Payment amount from VNPay
 *       - in: query
 *         name: vnp_ResponseCode
 *         schema:
 *           type: string
 *         description: Response code from VNPay
 *       - in: query
 *         name: vnp_TxnRef
 *         schema:
 *           type: string
 *         description: Order code reference
 *       - in: query
 *         name: vnp_SecureHash
 *         schema:
 *           type: string
 *         description: Security hash from VNPay
 *     responses:
 *       200:
 *         description: IPN processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 RspCode:
 *                   type: string
 *                   example: "00"
 *                 Message:
 *                   type: string
 *                   example: "Confirm Success"
 */
router.post("/vnpay-ipn", orderController.handlePaymentIPN);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of user's orders
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 */
router.get("/", protect, orderController.getUserOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", protect, orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancel order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Đổi ý không mua nữa"
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Đơn hàng đã được hủy thành công"
 *       400:
 *         description: Cannot cancel order in current status
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.put("/:id/cancel", protect, orderController.cancelOrder);

// Admin routes
/**
 * @swagger
 * /api/orders/admin/all:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, processing, shipping, delivered, cancelled, refunded]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: List of all orders
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/admin/all", protect, authorize("admin"), orderController.getAllOrders);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, paid, processing, shipping, delivered, cancelled, refunded]
 *                 example: "processing"
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Trạng thái đơn hàng đã được cập nhật"
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put("/:id/status", protect, authorize("admin"), orderController.updateOrderStatus);

module.exports = router; 