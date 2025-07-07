const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Vui lòng đăng nhập để truy cập ecommerce",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Token không hợp lệ hoặc user không tồn tại",
      });
    }

    if (!req.user.is_active) {
      return res.status(401).json({
        success: false,
        error: "Tài khoản đã bị vô hiệu hóa",
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Không có quyền truy cập vào route này",
    });
  }
};

// Optional authentication - doesn't require login but populates req.user if token exists
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token, continue without setting req.user
  if (!token) {
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (req.user && !req.user.is_active) {
      req.user = null; // Clear user if account is disabled
    }
    next();
  } catch (err) {
    // If token is invalid, continue without setting req.user
    next();
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Vai trò ${req.user.role} không được phép truy cập vào route này`,
      });
    }
    next();
  };
}; 