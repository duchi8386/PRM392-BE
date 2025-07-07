module.exports = {
  vnp_TmnCode: process.env.VNP_TMN_CODE || "GJ5CRTNX",
  vnp_HashSecret:
    process.env.VNP_HASH_SECRET || "BJ6DXVPCHRUS93W2ANR4LGCCGN5JS8WX",
  vnp_Url:
    process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnp_ReturnUrl:
    process.env.VNP_RETURN_URL ||
    "http://localhost:5000/api/orders/vnpay-return",
  vnp_IpnUrl:
    process.env.VNP_IPN_URL || "http://localhost:5000/api/orders/vnpay-ipn",
  vnp_ApiUrl:
    process.env.VNP_API_URL ||
    "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
};
