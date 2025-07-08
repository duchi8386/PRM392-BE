const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: [true, "Conversation ID là bắt buộc"],
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, // null for anonymous
  },
  sender_type: {
    type: String,
    enum: ["customer", "store", "system"],
    required: true,
  },
  sender_name: {
    type: String,
    default: "Anonymous",
  },
  content: {
    type: String,
    required: [true, "Nội dung tin nhắn là bắt buộc"],
    maxlength: [2000, "Tin nhắn không được vượt quá 2000 ký tự"],
  },
  message_type: {
    type: String,
    enum: ["text", "image", "file", "system_notification"],
    default: "text",
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimetype: String,
  }],
  is_read: {
    type: Boolean,
    default: false,
  },
  read_at: {
    type: Date,
    default: null,
  },
  edited_at: {
    type: Date,
    default: null,
  },
}, {
  collection: "messages",
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

// Index for performance
MessageSchema.index({ conversation_id: 1, created_at: 1 });
MessageSchema.index({ sender_id: 1 });
MessageSchema.index({ conversation_id: 1, is_read: 1 });

module.exports = mongoose.model("Message", MessageSchema); 