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

// Optional authentication middleware for anonymous cart support
exports.optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      // Try to authenticate if token is provided
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Token hợp lệ nhưng không tìm thấy user'
        });
      }
    } catch (error) {
      // If token is invalid, continue as anonymous user
      req.user = null;
    }
  }
  
  // Generate or use session ID for anonymous users
  if (!req.user) {
    // Get session ID from header or cookie, or generate new one
    let sessionId = req.headers['x-session-id'] || req.cookies?.cart_session_id;
    
    if (!sessionId) {
      sessionId = require('crypto').randomUUID();
      
      // Set cookie for session tracking
      res.cookie('cart_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }
    
    req.sessionId = sessionId;
  }
  
  next();
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