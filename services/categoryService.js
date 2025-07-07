const Category = require("../models/Category");

class CategoryService {
  /**
   * Get all categories
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Array>} - Categories
   */
  async getCategories(queryParams = {}) {
    try {
      const { is_active = true } = queryParams;
      let query = {};
      
      if (is_active !== undefined) {
        query.is_active = is_active;
      }
      
      return await Category.find(query).sort({ created_at: -1 });
    } catch (error) {
      throw new Error(`Error getting categories: ${error.message}`);
    }
  }

  /**
   * Get category by ID
   * @param {string} id - Category ID
   * @returns {Promise<Object>} - Category
   */
  async getCategoryById(id) {
    try {
      const category = await Category.findById(id);
      
      if (!category) {
        throw new Error("Không tìm thấy danh mục");
      }
      
      return category;
    } catch (error) {
      if (error.message === "Không tìm thấy danh mục") {
        throw error;
      }
      throw new Error(`Error getting category: ${error.message}`);
    }
  }

  /**
   * Create category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} - Created category
   */
  async createCategory(categoryData) {
    try {
      const category = new Category(categoryData);
      return await category.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Tên danh mục đã tồn tại");
      }
      throw new Error(`Error creating category: ${error.message}`);
    }
  }

  /**
   * Update category
   * @param {string} id - Category ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} - Updated category
   */
  async updateCategory(id, updateData) {
    try {
      const category = await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!category) {
        throw new Error("Không tìm thấy danh mục");
      }
      
      return category;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Tên danh mục đã tồn tại");
      }
      if (error.message === "Không tìm thấy danh mục") {
        throw error;
      }
      throw new Error(`Error updating category: ${error.message}`);
    }
  }

  /**
   * Delete category (soft delete)
   * @param {string} id - Category ID
   * @returns {Promise<Object>} - Deleted category
   */
  async deleteCategory(id) {
    try {
      const category = await Category.findByIdAndUpdate(
        id,
        { is_active: false },
        { new: true }
      );
      
      if (!category) {
        throw new Error("Không tìm thấy danh mục");
      }
      
      return category;
    } catch (error) {
      if (error.message === "Không tìm thấy danh mục") {
        throw error;
      }
      throw new Error(`Error deleting category: ${error.message}`);
    }
  }
}

module.exports = new CategoryService(); 