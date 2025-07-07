const cartService = require("../services/cartService");

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    const cart = await cartService.getCart(req.user._id);

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
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng chọn sản phẩm",
      });
    }

    const cart = await cartService.addToCart(req.user._id, product_id, quantity);

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
// @access  Private
exports.updateCartItem = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng cung cấp đầy đủ thông tin sản phẩm và số lượng",
      });
    }

    const cart = await cartService.updateCartItem(req.user._id, product_id, quantity);

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
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const cart = await cartService.removeFromCart(req.user._id, req.params.productId);

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
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const cart = await cartService.clearCart(req.user._id);

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
// @access  Private
exports.getCartItemCount = async (req, res) => {
  try {
    const count = await cartService.getCartItemCount(req.user._id);

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