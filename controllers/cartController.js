const cartService = require("../services/cartService");

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Public (with optional auth)
exports.getCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    const sessionId = req.sessionId;

    // If user is logged in and has session cart, merge them
    if (userId && sessionId) {
      const cart = await cartService.mergeCart(userId, sessionId);
      return res.status(200).json({
        success: true,
        data: cart,
      });
    }

    // If user is logged in but no session ID, try auto-merge recent cart
    if (userId && !sessionId) {
      const cart = await cartService.autoMergeRecentCart(userId);
      return res.status(200).json({
        success: true,
        data: cart,
      });
    }

    // Regular flow: get cart for user or session
    const cart = await cartService.getCart(userId, sessionId);

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Public (with optional auth)
exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng chọn sản phẩm",
      });
    }

    const userId = req.user?._id;
    const sessionId = req.sessionId;

    const cart = await cartService.addToCart(userId, sessionId, product_id, quantity);

    res.status(200).json({
      success: true,
      data: cart,
      message: "Sản phẩm đã được thêm vào giỏ hàng",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Public (with optional auth)
exports.updateCartItem = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng cung cấp đầy đủ thông tin sản phẩm và số lượng",
      });
    }

    const userId = req.user?._id;
    const sessionId = req.sessionId;

    const cart = await cartService.updateCartItem(userId, sessionId, product_id, quantity);

    res.status(200).json({
      success: true,
      data: cart,
      message: "Giỏ hàng đã được cập nhật",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Public (with optional auth)
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    const sessionId = req.sessionId;

    const cart = await cartService.removeFromCart(userId, sessionId, req.params.productId);

    res.status(200).json({
      success: true,
      data: cart,
      message: "Sản phẩm đã được xóa khỏi giỏ hàng",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Public (with optional auth)
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    const sessionId = req.sessionId;

    const cart = await cartService.clearCart(userId, sessionId);

    res.status(200).json({
      success: true,
      data: cart,
      message: "Giỏ hàng đã được xóa",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get cart item count
// @route   GET /api/cart/count
// @access  Public (with optional auth)
exports.getCartItemCount = async (req, res) => {
  try {
    const userId = req.user?._id;
    const sessionId = req.sessionId;

    const count = await cartService.getCartItemCount(userId, sessionId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}; 