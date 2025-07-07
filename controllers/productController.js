const productService = require("../services/productService"); // Đổi từ "../../services/ecommerce/productService"

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const result = await productService.getProducts(req.query);
    
    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error.message === "Không tìm thấy sản phẩm") {
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

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await productService.getFeaturedProducts();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);

    res.status(201).json({
      success: true,
      data: product,
      message: "Sản phẩm đã được tạo thành công",
    });
  } catch (error) {
    if (error.message === "Mã sản phẩm đã tồn tại") {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message === "Danh mục không tồn tại hoặc không hoạt động") {
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

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: product,
      message: "Sản phẩm đã được cập nhật thành công",
    });
  } catch (error) {
    if (error.message === "Không tìm thấy sản phẩm") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message === "Mã sản phẩm đã tồn tại" || 
        error.message === "Danh mục không tồn tại hoặc không hoạt động") {
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

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await productService.deleteProduct(req.params.id);

    res.status(200).json({
      success: true,
      data: product,
      message: "Sản phẩm đã được xóa thành công",
    });
  } catch (error) {
    if (error.message === "Không tìm thấy sản phẩm") {
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

// @desc    Get products by category
// @route   GET /api/categories/:categoryId/products
// @access  Public
exports.getProductsByCategory = async (req, res) => {
  try {
    const result = await productService.getProductsByCategory(
      req.params.categoryId,
      req.query
    );

    res.status(200).json({
      success: true,
      data: result.products,
      category: result.category,
      pagination: result.pagination,
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