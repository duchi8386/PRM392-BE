const Cart = require("../models/Cart"); // Đổi từ "../../models/ecommerce/Cart"
const Product = require("../models/Product"); // Đổi từ "../../models/ecommerce/Product"

class CartService {
  /**
   * Get user's cart
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User's cart
   */
  async getCart(userId) {
    try {
      let cart = await Cart.findOne({ user_id: userId })
        .populate({
          path: 'items.product_id',
          populate: {
            path: 'category_id'
          }
        });

      if (!cart) {
        // Create empty cart if not exists
        cart = new Cart({
          user_id: userId,
          items: [],
          total_items: 0,
          total_amount: 0
        });
        await cart.save();
      }

      return cart;
    } catch (error) {
      throw new Error(`Error getting cart: ${error.message}`);
    }
  }

  /**
   * Add item to cart
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>} - Updated cart
   */
  async addToCart(userId, productId, quantity = 1) {
    try {
      // Check if product exists and is active
      const product = await Product.findOne({ 
        _id: productId, 
        is_active: true 
      });

      if (!product) {
        throw new Error("Sản phẩm không tồn tại hoặc không còn bán");
      }

      // Check stock availability
      if (product.stock_quantity < quantity) {
        throw new Error("Số lượng sản phẩm không đủ trong kho");
      }

      // Get or create cart
      let cart = await Cart.findOne({ user_id: userId });
      if (!cart) {
        cart = new Cart({
          user_id: userId,
          items: []
        });
      }

      // Check if product already in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.product_id.toString() === productId
      );

      const price = product.price;

      if (existingItemIndex > -1) {
        // Update existing item
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        
        // Check total stock availability
        if (product.stock_quantity < newQuantity) {
          throw new Error("Số lượng sản phẩm không đủ trong kho");
        }

        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].price = price;
        cart.items[existingItemIndex].total = price * newQuantity;
      } else {
        // Add new item
        cart.items.push({
          product_id: productId,
          quantity: quantity,
          price: price,
          total: price * quantity
        });
      }

      await cart.save();

      // Populate and return updated cart
      await cart.populate({
        path: 'items.product_id',
        populate: {
          path: 'category_id'
        }
      });

      return cart;
    } catch (error) {
      throw new Error(`Error adding to cart: ${error.message}`);
    }
  }

  /**
   * Update cart item quantity
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} - Updated cart
   */
  async updateCartItem(userId, productId, quantity) {
    try {
      if (quantity < 1) {
        throw new Error("Số lượng phải lớn hơn 0");
      }

      // Check if product exists and is active
      const product = await Product.findOne({ 
        _id: productId, 
        is_active: true 
      });

      if (!product) {
        throw new Error("Sản phẩm không tồn tại hoặc không còn bán");
      }

      // Check stock availability
      if (product.stock_quantity < quantity) {
        throw new Error("Số lượng sản phẩm không đủ trong kho");
      }

      const cart = await Cart.findOne({ user_id: userId });
      if (!cart) {
        throw new Error("Không tìm thấy giỏ hàng");
      }

      const itemIndex = cart.items.findIndex(
        item => item.product_id.toString() === productId
      );

      if (itemIndex === -1) {
        throw new Error("Sản phẩm không có trong giỏ hàng");
      }

      const price = product.price;
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = price;
      cart.items[itemIndex].total = price * quantity;

      await cart.save();

      // Populate and return updated cart
      await cart.populate({
        path: 'items.product_id',
        populate: {
          path: 'category_id'
        }
      });

      return cart;
    } catch (error) {
      throw new Error(`Error updating cart item: ${error.message}`);
    }
  }

  /**
   * Remove item from cart
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Updated cart
   */
  async removeFromCart(userId, productId) {
    try {
      const cart = await Cart.findOne({ user_id: userId });
      if (!cart) {
        throw new Error("Không tìm thấy giỏ hàng");
      }

      cart.items = cart.items.filter(
        item => item.product_id.toString() !== productId
      );

      await cart.save();

      // Populate and return updated cart
      await cart.populate({
        path: 'items.product_id',
        populate: {
          path: 'category_id'
        }
      });

      return cart;
    } catch (error) {
      throw new Error(`Error removing from cart: ${error.message}`);
    }
  }

  /**
   * Clear entire cart
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Empty cart
   */
  async clearCart(userId) {
    try {
      const cart = await Cart.findOne({ user_id: userId });
      if (!cart) {
        throw new Error("Không tìm thấy giỏ hàng");
      }

      cart.items = [];
      await cart.save();

      return cart;
    } catch (error) {
      throw new Error(`Error clearing cart: ${error.message}`);
    }
  }

  /**
   * Get cart item count
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Total items in cart
   */
  async getCartItemCount(userId) {
    try {
      const cart = await Cart.findOne({ user_id: userId });
      return cart ? cart.total_items : 0;
    } catch (error) {
      throw new Error(`Error getting cart item count: ${error.message}`);
    }
  }

  /**
   * Validate cart before checkout
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Validation result
   */
  async validateCart(userId) {
    try {
      const cart = await Cart.findOne({ user_id: userId })
        .populate('items.product_id');

      if (!cart || cart.items.length === 0) {
        throw new Error("Giỏ hàng trống");
      }

      const validationErrors = [];
      let hasChanges = false;

      for (let i = cart.items.length - 1; i >= 0; i--) {
        const item = cart.items[i];
        const product = item.product_id;

        // Check if product still exists and is active
        if (!product || !product.is_active) {
          cart.items.splice(i, 1);
          hasChanges = true;
          validationErrors.push({
            product_id: item.product_id,
            error: "Sản phẩm không còn bán"
          });
          continue;
        }

        // Check stock availability
        if (product.stock_quantity < item.quantity) {
          if (product.stock_quantity === 0) {
            cart.items.splice(i, 1);
            hasChanges = true;
            validationErrors.push({
              product_id: product._id,
              product_name: product.name,
              error: "Sản phẩm đã hết hàng"
            });
          } else {
            cart.items[i].quantity = product.stock_quantity;
            cart.items[i].total = cart.items[i].price * product.stock_quantity;
            hasChanges = true;
            validationErrors.push({
              product_id: product._id,
              product_name: product.name,
              error: `Chỉ còn ${product.stock_quantity} sản phẩm trong kho`,
              adjusted_quantity: product.stock_quantity
            });
          }
        }

        // Check if price has changed
        const currentPrice = product.price;
        if (item.price !== currentPrice) {
          cart.items[i].price = currentPrice;
          cart.items[i].total = currentPrice * item.quantity;
          hasChanges = true;
          validationErrors.push({
            product_id: product._id,
            product_name: product.name,
            error: "Giá sản phẩm đã thay đổi",
            old_price: item.price,
            new_price: currentPrice
          });
        }
      }

      if (hasChanges) {
        await cart.save();
      }

      return {
        cart,
        isValid: validationErrors.length === 0,
        errors: validationErrors
      };
    } catch (error) {
      throw new Error(`Error validating cart: ${error.message}`);
    }
  }
}

module.exports = new CartService(); 