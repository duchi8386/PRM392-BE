const Cart = require("../models/Cart"); // Đổi từ "../../models/ecommerce/Cart"
const Product = require("../models/Product"); // Đổi từ "../../models/ecommerce/Product"

class CartService {
  /**
   * Get cart identifier based on user or session
   * @param {string} userId - User ID (optional)
   * @param {string} sessionId - Session ID (optional)
   * @returns {Object} - Query object for cart
   */
  _getCartQuery(userId, sessionId) {
    if (userId) {
      return { user_id: userId };
    } else if (sessionId) {
      return { session_id: sessionId };
    }
    throw new Error("Either userId or sessionId must be provided");
  }

  /**
   * Get user's cart
   * @param {string} userId - User ID (optional)
   * @param {string} sessionId - Session ID (optional)
   * @returns {Promise<Object>} - User's cart
   */
  async getCart(userId, sessionId) {
    try {
      const query = this._getCartQuery(userId, sessionId);
      
      let cart = await Cart.findOne(query)
        .populate({
          path: 'items.product_id',
          populate: {
            path: 'category_id'
          }
        });

      if (!cart) {
        // Create empty cart if not exists
        const cartData = {
          items: [],
          total_items: 0,
          total_amount: 0
        };
        
        if (userId) {
          cartData.user_id = userId;
        } else {
          cartData.session_id = sessionId;
        }
        
        cart = new Cart(cartData);
        await cart.save();
      }

      return cart;
    } catch (error) {
      throw new Error(`Error getting cart: ${error.message}`);
    }
  }

  /**
   * Add item to cart
   * @param {string} userId - User ID (optional)
   * @param {string} sessionId - Session ID (optional)
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>} - Updated cart
   */
  async addToCart(userId, sessionId, productId, quantity = 1) {
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
      const query = this._getCartQuery(userId, sessionId);
      let cart = await Cart.findOne(query);
      
      if (!cart) {
        const cartData = {
          items: []
        };
        
        if (userId) {
          cartData.user_id = userId;
        } else {
          cartData.session_id = sessionId;
        }
        
        cart = new Cart(cartData);
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
   * @param {string} userId - User ID (optional)
   * @param {string} sessionId - Session ID (optional)
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} - Updated cart
   */
  async updateCartItem(userId, sessionId, productId, quantity) {
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

      const query = this._getCartQuery(userId, sessionId);
      const cart = await Cart.findOne(query);
      
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
   * @param {string} userId - User ID (optional)
   * @param {string} sessionId - Session ID (optional)
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Updated cart
   */
  async removeFromCart(userId, sessionId, productId) {
    try {
      const query = this._getCartQuery(userId, sessionId);
      const cart = await Cart.findOne(query);
      
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
   * @param {string} userId - User ID (optional)
   * @param {string} sessionId - Session ID (optional)
   * @returns {Promise<Object>} - Empty cart
   */
  async clearCart(userId, sessionId) {
    try {
      const query = this._getCartQuery(userId, sessionId);
      const cart = await Cart.findOne(query);
      
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
   * @param {string} userId - User ID (optional)
   * @param {string} sessionId - Session ID (optional)
   * @returns {Promise<number>} - Total items in cart
   */
  async getCartItemCount(userId, sessionId) {
    try {
      const query = this._getCartQuery(userId, sessionId);
      const cart = await Cart.findOne(query);
      return cart ? cart.total_items : 0;
    } catch (error) {
      throw new Error(`Error getting cart item count: ${error.message}`);
    }
  }

  /**
   * Validate cart before checkout
   * @param {string} userId - User ID (optional)
   * @param {string} sessionId - Session ID (optional)
   * @returns {Promise<Object>} - Validation result
   */
  async validateCart(userId, sessionId) {
    try {
      const query = this._getCartQuery(userId, sessionId);
      const cart = await Cart.findOne(query)
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

  /**
   * Automatically merge the most recent anonymous cart when user logs in
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Merged cart or user cart
   */
  async autoMergeRecentCart(userId) {
    try {
      console.log('🔍 Auto-merging recent anonymous cart for user:', userId);

      // Find the most recent anonymous cart (within last 24 hours)
      const recentSessionCart = await Cart.findOne({
        session_id: { $exists: true },
        user_id: null,
        items: { $ne: [] }, // Not empty
        updated_at: { 
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }).sort({ updated_at: -1 }); // Most recent first

      if (recentSessionCart) {
        console.log('📦 Found recent session cart:', {
          sessionId: recentSessionCart.session_id,
          items: recentSessionCart.items.length,
          updatedAt: recentSessionCart.updated_at
        });

        // Use existing merge logic
        return await this.mergeCart(userId, recentSessionCart.session_id);
      }

      console.log('ℹ️ No recent anonymous cart found, returning user cart');
      // No recent session cart, just return user cart
      return await this.getCart(userId, null);
    } catch (error) {
      console.error('❌ autoMergeRecentCart Error:', error.message);
      // If merge fails, still return user cart
      return await this.getCart(userId, null);
    }
  }

  /**
   * Merge anonymous cart with user cart when user logs in
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Merged cart
   */
  async mergeCart(userId, sessionId) {
    try {
      const sessionCart = await Cart.findOne({ session_id: sessionId });
      
      if (!sessionCart || sessionCart.items.length === 0) {
        // No session cart or empty, just return/create user cart
        return await this.getCart(userId, null);
      }

      // Get or create user cart
      let userCart = await Cart.findOne({ user_id: userId });
      
      if (!userCart) {
        // Convert session cart to user cart
        sessionCart.user_id = userId;
        sessionCart.session_id = undefined;
        await sessionCart.save();
        return sessionCart;
      }

      // Merge carts - add session cart items to user cart
      for (const sessionItem of sessionCart.items) {
        const existingItemIndex = userCart.items.findIndex(
          item => item.product_id.toString() === sessionItem.product_id.toString()
        );

        if (existingItemIndex > -1) {
          // Update existing item quantity
          userCart.items[existingItemIndex].quantity += sessionItem.quantity;
          userCart.items[existingItemIndex].total = 
            userCart.items[existingItemIndex].price * userCart.items[existingItemIndex].quantity;
        } else {
          // Add new item
          userCart.items.push(sessionItem);
        }
      }

      await userCart.save();

      // Delete session cart
      await Cart.deleteOne({ session_id: sessionId });

      // Populate and return merged cart
      await userCart.populate({
        path: 'items.product_id',
        populate: {
          path: 'category_id'
        }
      });

      return userCart;
    } catch (error) {
      throw new Error(`Error merging cart: ${error.message}`);
    }
  }
}

module.exports = new CartService(); 