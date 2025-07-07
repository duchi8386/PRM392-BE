const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "GenHealth Ecommerce API",
      version: "1.0.0",
      description: "API documentation for GenHealth Ecommerce microservice",
      contact: {
        name: "GenHealth Team",
        email: "support@genhealth.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: "Development server",
      },
      {
        url: "https://api.genhealth.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["full_name", "email", "password", "phone"],
          properties: {
            _id: {
              type: "string",
              description: "User ID",
            },
            full_name: {
              type: "string",
              description: "Full name",
              example: "Nguyễn Văn A",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address",
              example: "nguyen.vana@example.com",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "Password (min 6 characters)",
              example: "password123",
            },
            phone: {
              type: "string",
              description: "Phone number",
              example: "0901234567",
            },
            role: {
              type: "string",
              enum: ["user", "admin"],
              default: "user",
              description: "User role",
            },
            address: {
              type: "string",
              description: "Address",
              example: "123 Main St",
            },
            city: {
              type: "string",
              description: "City",
              example: "Ho Chi Minh",
            },
            is_active: {
              type: "boolean",
              default: true,
              description: "Account status",
            },
          },
        },
        Category: {
          type: "object",
          required: ["name"],
          properties: {
            _id: {
              type: "string",
              description: "Category ID",
            },
            name: {
              type: "string",
              description: "Category name",
              example: "Vitamin & Supplements",
            },
            description: {
              type: "string",
              description: "Category description",
              example: "Vitamins and dietary supplements",
            },
            image_url: {
              type: "string",
              format: "uri",
              description: "Category image URL",
              example: "https://example.com/image.jpg",
            },
            is_active: {
              type: "boolean",
              default: true,
              description: "Category status",
            },
          },
        },
        Product: {
          type: "object",
          required: ["name", "description", "price", "category_id", "sku"],
          properties: {
            _id: {
              type: "string",
              description: "Product ID",
            },
            name: {
              type: "string",
              description: "Product name",
              example: "Vitamin C 1000mg",
            },
            description: {
              type: "string",
              description: "Product description",
              example: "High quality Vitamin C supplement",
            },
            price: {
              type: "number",
              minimum: 0,
              description: "Product price",
              example: 25.99,
            },
            category_id: {
              type: "string",
              description: "Category ID",
            },
            images: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: {
                    type: "string",
                    format: "uri",
                    description: "Image URL",
                  },
                  is_primary: {
                    type: "boolean",
                    default: false,
                    description: "Primary image flag",
                  },
                },
              },
            },
            stock_quantity: {
              type: "integer",
              minimum: 0,
              default: 0,
              description: "Stock quantity",
              example: 100,
            },
            sku: {
              type: "string",
              description: "Product SKU",
              example: "VIT-C-1000",
            },
            is_active: {
              type: "boolean",
              default: true,
              description: "Product status",
            },
            is_featured: {
              type: "boolean",
              default: false,
              description: "Featured product flag",
            },
          },
        },
        Cart: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Cart ID",
            },
            user_id: {
              type: "string",
              description: "User ID",
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: {
                    type: "string",
                    description: "Product ID",
                  },
                  quantity: {
                    type: "integer",
                    minimum: 1,
                    description: "Item quantity",
                    example: 2,
                  },
                  price: {
                    type: "number",
                    description: "Item price",
                    example: 25.99,
                  },
                  total: {
                    type: "number",
                    description: "Item total",
                    example: 51.98,
                  },
                },
              },
            },
            total_items: {
              type: "integer",
              description: "Total items count",
              example: 5,
            },
            total_amount: {
              type: "number",
              description: "Total cart amount",
              example: 129.95,
            },
          },
        },
        Order: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Order ID",
            },
            order_code: {
              type: "string",
              description: "Order code",
              example: "GH2401234567",
            },
            user_id: {
              type: "string",
              description: "User ID",
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: {
                    type: "string",
                    description: "Product ID",
                  },
                  name: {
                    type: "string",
                    description: "Product name",
                    example: "Vitamin C 1000mg",
                  },
                  price: {
                    type: "number",
                    description: "Product price",
                    example: 25.99,
                  },
                  quantity: {
                    type: "integer",
                    description: "Quantity ordered",
                    example: 2,
                  },
                  total: {
                    type: "number",
                    description: "Item total",
                    example: 51.98,
                  },
                },
              },
            },
            subtotal: {
              type: "number",
              description: "Subtotal amount",
              example: 129.95,
            },
            shipping_fee: {
              type: "number",
              description: "Shipping fee",
              example: 25000,
            },
            total_amount: {
              type: "number",
              description: "Total order amount",
              example: 154.95,
            },
            status: {
              type: "string",
              enum: ["pending", "paid", "processing", "shipping", "delivered", "cancelled", "refunded"],
              description: "Order status",
              example: "pending",
            },
            payment_status: {
              type: "string",
              enum: ["pending", "paid", "failed", "refunded"],
              description: "Payment status",
              example: "pending",
            },
            shipping_address: {
              type: "object",
              properties: {
                full_name: {
                  type: "string",
                  example: "Nguyễn Văn A",
                },
                phone: {
                  type: "string",
                  example: "0901234567",
                },
                address: {
                  type: "string",
                  example: "123 Đường ABC, Quận 1",
                },
                city: {
                  type: "string",
                  example: "Ho Chi Minh",
                },
                postal_code: {
                  type: "string",
                  example: "70000",
                },
                notes: {
                  type: "string",
                  example: "Giao hàng buổi chiều",
                },
              },
            },
            payment_info: {
              type: "object",
              properties: {
                method: {
                  type: "string",
                  enum: ["vnpay", "cod"],
                  example: "vnpay",
                },
                vnpay_transaction_id: {
                  type: "string",
                  example: "14419151",
                },
                vnpay_response_code: {
                  type: "string",
                  example: "00",
                },
                paid_at: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-15T10:30:00Z",
                },
              },
            },
            notes: {
              type: "string",
              description: "Order notes",
              example: "Ghi chú đơn hàng",
            },
            ordered_at: {
              type: "string",
              format: "date-time",
              description: "Order creation time",
              example: "2024-01-15T10:00:00Z",
            },
            estimated_delivery: {
              type: "string",
              format: "date-time",
              description: "Estimated delivery date",
              example: "2024-01-19T10:00:00Z",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Created timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Updated timestamp",
            },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Operation success status",
            },
            data: {
              type: "object",
              description: "Response data",
            },
            message: {
              type: "string",
              description: "Response message",
            },
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
        PaginationResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "array",
              items: {},
            },
            pagination: {
              type: "object",
              properties: {
                current_page: {
                  type: "integer",
                  example: 1,
                },
                total_pages: {
                  type: "integer",
                  example: 5,
                },
                total_items: {
                  type: "integer",
                  example: 100,
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./controllers/*.js"], // Paths to files containing OpenAPI definitions
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi,
}; 