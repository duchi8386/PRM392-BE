const Product = require("../models/Product"); // Đổi từ "../../models/ecommerce/Product"
const Category = require("../models/Category"); // Đổi từ "../../models/ecommerce/Category"

class ProductService {
  /**
   * Get products with filtering, sorting and pagination
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} - Products and pagination info
   */
  async getProducts(queryParams) {
    try {
      const { page = 1, limit = 20, category, search, sort } = queryParams;

      let query = { is_active: true };

      // Filter by category
      if (category) {
        query.category_id = category;
      }

      // Search by name
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      // Sort options
      let sortOption = { created_at: -1 };
      switch (sort) {
        case "price_asc":
          sortOption = { price: 1 };
          break;
        case "price_desc":
          sortOption = { price: -1 };
          break;
        case "name_asc":
          sortOption = { name: 1 };
          break;
        case "name_desc":
          sortOption = { name: -1 };
          break;
      }

      const products = await Product.find(query)
        .populate("category_id")
        .sort(sortOption)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Product.countDocuments(query);

      return {
        products,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
        },
      };
    } catch (error) {
      throw new Error(`Error getting products: ${error.message}`);
    }
  }

  /**
   * Get product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} - Product
   */
  async getProductById(id) {
    try {
      const product = await Product.findById(id).populate("category_id");

      if (!product) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      return product;
    } catch (error) {
      if (error.message === "Không tìm thấy sản phẩm") {
        throw error;
      }
      throw new Error(`Error getting product: ${error.message}`);
    }
  }

  /**
   * Get featured products
   * @returns {Promise<Array>} - Featured products
   */
  async getFeaturedProducts() {
    try {
      return await Product.find({ 
        is_active: true, 
        is_featured: true 
      }).populate("category_id").limit(10);
    } catch (error) {
      throw new Error(`Error getting featured products: ${error.message}`);
    }
  }

  /**
   * Get categories
   * @returns {Promise<Array>} - Categories
   */
  async getCategories() {
    try {
      return await Category.find({ is_active: true });
    } catch (error) {
      throw new Error(`Error getting categories: ${error.message}`);
    }
  }

  /**
   * Create new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} - Created product
   */
  async createProduct(productData) {
    try {
      // Check if SKU already exists
      const existingSku = await Product.findOne({ sku: productData.sku });
      if (existingSku) {
        throw new Error("Mã sản phẩm đã tồn tại");
      }

      // Check if category exists
      const category = await Category.findById(productData.category_id);
      if (!category || !category.is_active) {
        throw new Error("Danh mục không tồn tại hoặc không hoạt động");
      }

      const product = new Product(productData);
      const savedProduct = await product.save();
      
      // Populate category before returning
      await savedProduct.populate("category_id");
      return savedProduct;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Mã sản phẩm đã tồn tại");
      }
      throw new Error(`Error creating product: ${error.message}`);
    }
  }

  /**
   * Update product
   * @param {string} id - Product ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} - Updated product
   */
  async updateProduct(id, updateData) {
    try {
      // Check if product exists
      const product = await Product.findById(id);
      if (!product) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      // Check if new SKU conflicts with existing product
      if (updateData.sku && updateData.sku !== product.sku) {
        const existingSku = await Product.findOne({
          sku: updateData.sku,
          _id: { $ne: id }
        });
        if (existingSku) {
          throw new Error("Mã sản phẩm đã tồn tại");
        }
      }

      // Check if category exists (if category is being updated)
      if (updateData.category_id) {
        const category = await Category.findById(updateData.category_id);
        if (!category || !category.is_active) {
          throw new Error("Danh mục không tồn tại hoặc không hoạt động");
        }
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate("category_id");

      return updatedProduct;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Mã sản phẩm đã tồn tại");
      }
      if (error.message === "Không tìm thấy sản phẩm" || 
          error.message === "Mã sản phẩm đã tồn tại" ||
          error.message === "Danh mục không tồn tại hoặc không hoạt động") {
        throw error;
      }
      throw new Error(`Error updating product: ${error.message}`);
    }
  }

  /**
   * Delete product (soft delete)
   * @param {string} id - Product ID
   * @returns {Promise<Object>} - Deleted product
   */
  async deleteProduct(id) {
    try {
      const product = await Product.findById(id);
      if (!product) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      // Soft delete
      const deletedProduct = await Product.findByIdAndUpdate(
        id,
        { is_active: false },
        { new: true }
      ).populate("category_id");

      return deletedProduct;
    } catch (error) {
      if (error.message === "Không tìm thấy sản phẩm") {
        throw error;
      }
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }

  /**
   * Permanently delete product
   * @param {string} id - Product ID
   * @returns {Promise<Object>} - Result
   */
  async hardDeleteProduct(id) {
    try {
      const product = await Product.findById(id);
      if (!product) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      await Product.findByIdAndDelete(id);
      return { message: "Sản phẩm đã được xóa vĩnh viễn" };
    } catch (error) {
      if (error.message === "Không tìm thấy sản phẩm") {
        throw error;
      }
      throw new Error(`Error permanently deleting product: ${error.message}`);
    }
  }

  /**
   * Update product stock
   * @param {string} id - Product ID
   * @param {number} quantity - New stock quantity
   * @returns {Promise<Object>} - Updated product
   */
  async updateProductStock(id, quantity) {
    try {
      const product = await Product.findById(id);
      if (!product) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      if (quantity < 0) {
        throw new Error("Số lượng tồn kho không thể âm");
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { stock_quantity: quantity },
        { new: true }
      ).populate("category_id");

      return updatedProduct;
    } catch (error) {
      if (error.message === "Không tìm thấy sản phẩm" || 
          error.message === "Số lượng tồn kho không thể âm") {
        throw error;
      }
      throw new Error(`Error updating product stock: ${error.message}`);
    }
  }

  /**
   * Toggle product featured status
   * @param {string} id - Product ID
   * @returns {Promise<Object>} - Updated product
   */
  async toggleProductFeatured(id) {
    try {
      const product = await Product.findById(id);
      if (!product) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { is_featured: !product.is_featured },
        { new: true }
      ).populate("category_id");

      return updatedProduct;
    } catch (error) {
      if (error.message === "Không tìm thấy sản phẩm") {
        throw error;
      }
      throw new Error(`Error toggling product featured status: ${error.message}`);
    }
  }

  /**
   * Get products by category
   * @param {string} categoryId - Category ID
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} - Products and pagination info
   */
  async getProductsByCategory(categoryId, queryParams) {
    try {
      // Check if category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new Error("Không tìm thấy danh mục");
      }

      const { page = 1, limit = 20, search, sort } = queryParams;

      let query = { 
        category_id: categoryId, 
        is_active: true 
      };

      // Search by name
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      // Sort options
      let sortOption = { created_at: -1 };
      switch (sort) {
        case "price_asc":
          sortOption = { price: 1 };
          break;
        case "price_desc":
          sortOption = { price: -1 };
          break;
        case "name_asc":
          sortOption = { name: 1 };
          break;
        case "name_desc":
          sortOption = { name: -1 };
          break;
      }

      const products = await Product.find(query)
        .populate("category_id")
        .sort(sortOption)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Product.countDocuments(query);

      return {
        products,
        category,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
        },
      };
    } catch (error) {
      if (error.message === "Không tìm thấy danh mục") {
        throw error;
      }
      throw new Error(`Error getting products by category: ${error.message}`);
    }
  }
}

module.exports = new ProductService(); 