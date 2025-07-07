const categoryService = require("../services/categoryService");

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await categoryService.getCategories(req.query);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error.message === "Không tìm thấy danh mục") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const category = await categoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      data: category,
      message: "Danh mục đã được tạo thành công",
    });
  } catch (error) {
    if (error.message === "Tên danh mục đã tồn tại") {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: category,
      message: "Danh mục đã được cập nhật thành công",
    });
  } catch (error) {
    if (error.message === "Không tìm thấy danh mục") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message === "Tên danh mục đã tồn tại") {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Delete category (soft delete)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);

    res.status(200).json({
      success: true,
      data: category,
      message: "Danh mục đã được xóa thành công",
    });
  } catch (error) {
    if (error.message === "Không tìm thấy danh mục") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}; 