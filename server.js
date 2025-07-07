const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const { specs, swaggerUi } = require("./config/swagger");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    process.env.MAIN_APP_URL || "http://localhost:5000",
    "http://localhost:3001", // React dev server
    "http://localhost:3000", // Next.js dev server
    "http://localhost:4200", // Angular dev server
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Route files
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");

// Mount routers với prefix
const API_PREFIX = process.env.API_PREFIX || "/api";
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);

// Swagger Documentation
if (process.env.SWAGGER_ENABLED !== 'false') {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "GenHealth Ecommerce API Documentation",
  }));
}

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GenHealth Ecommerce API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      products: `${API_PREFIX}/products`,
      categories: `${API_PREFIX}/categories`,
      cart: `${API_PREFIX}/cart`,
      orders: `${API_PREFIX}/orders`,
    },
    documentation: process.env.SWAGGER_ENABLED !== 'false' ? "/api-docs" : null
  });
});

// Health check endpoint for load balancer
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "GenHealth Ecommerce API",
    version: "1.0.0",
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 GenHealth Ecommerce API running on port ${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 API Base URL: http://localhost:${PORT}${API_PREFIX}`);
  console.log(`🛍️  Products: http://localhost:${PORT}${API_PREFIX}/products`);
  console.log(
    `📂 Categories: http://localhost:${PORT}${API_PREFIX}/categories`
  );
  console.log(`🛒 Cart: http://localhost:${PORT}${API_PREFIX}/cart`);
  console.log(`📦 Orders: http://localhost:${PORT}${API_PREFIX}/orders`);
  console.log(`🔐 Auth: http://localhost:${PORT}${API_PREFIX}/auth`);
  if (process.env.SWAGGER_ENABLED !== 'false') {
    console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully"); 
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("unhandledRejection", (err, promise) => {
  console.log(`❌ Error: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
