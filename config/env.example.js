// Copy nội dung này vào file .env trong thư mục root

const envConfig = `
# ======================
# SERVER CONFIGURATION
# ======================
PORT=3000
NODE_ENV=development

# ======================
# DATABASE CONFIGURATION  
# ======================
# Tạo database riêng cho ecommerce
MONGODB_URI=mongodb://minh:Trongminh2810@mc.wizlab.io.vn:27017/GenHealth-Ecommerce

# ======================
# JWT AUTHENTICATION
# ======================
# Sử dụng same JWT secret để compatible với main app
JWT_SECRET=821jr978p13yhr7813hr89012u3r8821jr978p13yhr7813hr89012u3r8182yrh1978h2187dyh1297ry3984ur3298re1280uer7832yr0812ur7329r937hdishdiunekhdfns8yfh78913hf781whqd9hqd87wd9219d81278
JWT_EXPIRE=30d

# ======================
# VNPAY CONFIGURATION
# ======================
VNP_TMN_CODE=GJ5CRTNX
VNP_HASH_SECRET=BJ6DXVPCHRUS93W2ANR4LGCCGN5JS8WX
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction

# Return URLs cho ecommerce
VNP_RETURN_URL=http://localhost:3000/api/payment/vnpay_return
VNP_IPN_URL=http://localhost:3000/api/payment/vnpay_ipn

# ======================
# CORS CONFIGURATION
# ======================
# Cho phép frontend connect
FRONTEND_URL=http://localhost:3000
MAIN_APP_URL=http://localhost:5000

# ======================
# API CONFIGURATION
# ======================
API_PREFIX=/api
SWAGGER_ENABLED=true
`;

module.exports = envConfig;
