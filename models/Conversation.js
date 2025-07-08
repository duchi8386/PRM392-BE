const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  session_id: {
    type: String,
    default: null, // For anonymous users
  },
  customer_name: {
    type: String,
    default: "Anonymous Customer",
  },
  customer_email: {
    type: String,
    default: null,
  },
  subject: {
    type: String,
    default: "General Inquiry",
  },
  status: {
    type: String,
    enum: ["active", "closed", "pending"],
    default: "active",
  },
  last_message: {
    content: String,
    sender_type: {
      type: String,
      enum: ["customer", "store"],
    },
    timestamp: Date,
  },
  unread_count: {
    customer: {
      type: Number,
      default: 0,
    },
    store: {
      type: Number,
      default: 0,
    },
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Store admin/support
    default: null,
  },
  tags: [{
    type: String,
  }],
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },
}, {
  collection: "conversations",
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

// Index for performance
ConversationSchema.index({ customer_id: 1, status: 1 });
ConversationSchema.index({ session_id: 1 });
ConversationSchema.index({ status: 1, created_at: -1 });
ConversationSchema.index({ assigned_to: 1 });

module.exports = mongoose.model("Conversation", ConversationSchema); 