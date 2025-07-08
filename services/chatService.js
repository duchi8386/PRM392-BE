const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

class ChatService {
  /**
   * Create or get conversation
   * @param {string} customerId - Customer ID (optional for anonymous)
   * @param {string} sessionId - Session ID for anonymous users
   * @param {string} customerName - Customer name
   * @param {string} customerEmail - Customer email
   * @param {string} subject - Conversation subject
   * @returns {Promise<Object>} - Conversation
   */
  async createOrGetConversation(customerId, sessionId, customerName = "Anonymous Customer", customerEmail = null, subject = "General Inquiry") {
    try {
      // Find existing active conversation
      const query = customerId 
        ? { customer_id: customerId, status: { $in: ["active", "pending"] } }
        : { session_id: sessionId, status: { $in: ["active", "pending"] } };

      let conversation = await Conversation.findOne(query)
        .populate('assigned_to', 'name email')
        .sort({ updated_at: -1 });

      if (!conversation) {
        // Create new conversation
        conversation = new Conversation({
          customer_id: customerId,
          session_id: sessionId,
          customer_name: customerName,
          customer_email: customerEmail,
          subject: subject,
          status: "active",
        });
        await conversation.save();

        // Populate after save
        await conversation.populate('assigned_to', 'name email');
      }

      return conversation;
    } catch (error) {
      throw new Error(`Error creating/getting conversation: ${error.message}`);
    }
  }

  /**
   * Verify conversation access
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Conversation if access granted
   */
  async verifyConversationAccess(conversationId, userId, sessionId) {
    try {
      const query = { _id: conversationId };
      
      if (userId) {
        query.customer_id = userId;
      } else if (sessionId) {
        query.session_id = sessionId;
      } else {
        return null;
      }

      return await Conversation.findOne(query);
    } catch (error) {
      throw new Error(`Error verifying conversation access: ${error.message}`);
    }
  }

  /**
   * Send message
   * @param {string} conversationId - Conversation ID
   * @param {string} senderId - Sender ID (optional for anonymous)
   * @param {string} senderType - "customer" or "store"
   * @param {string} content - Message content
   * @param {string} senderName - Sender name
   * @returns {Promise<Object>} - Created message
   */
  async sendMessage(conversationId, senderId, senderType, content, senderName = "Anonymous") {
    try {
      // Create message
      const message = new Message({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: senderType,
        sender_name: senderName,
        content: content.trim(),
      });

      await message.save();

      // Update conversation
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.last_message = {
          content: content,
          sender_type: senderType,
          timestamp: new Date(),
        };

        // Update unread count
        if (senderType === "customer") {
          conversation.unread_count.store += 1;
        } else {
          conversation.unread_count.customer += 1;
        }

        conversation.updated_at = new Date();
        await conversation.save();
      }

      // Populate message for response
      await message.populate([
        { path: 'conversation_id' },
        { path: 'sender_id', select: 'name email' }
      ]);

      return message;
    } catch (error) {
      throw new Error(`Error sending message: ${error.message}`);
    }
  }

  /**
   * Get conversation messages
   * @param {string} conversationId - Conversation ID
   * @param {number} page - Page number
   * @param {number} limit - Messages per page
   * @returns {Promise<Object>} - Messages with pagination
   */
  async getMessages(conversationId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;

      const messages = await Message.find({ conversation_id: conversationId })
        .populate('sender_id', 'name email')
        .sort({ created_at: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Message.countDocuments({ conversation_id: conversationId });

      return {
        messages,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_messages: total,
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Error getting messages: ${error.message}`);
    }
  }

  /**
   * Get conversations (for admin)
   * @param {string} status - Conversation status filter
   * @param {number} page - Page number
   * @param {number} limit - Conversations per page
   * @param {string} search - Search term
   * @returns {Promise<Object>} - Conversations with pagination
   */
  async getConversations(status = "active", page = 1, limit = 20, search = "") {
    try {
      const skip = (page - 1) * limit;
      let filter = status === "all" ? {} : { status };

      // Add search filter
      if (search) {
        filter.$or = [
          { customer_name: { $regex: search, $options: 'i' } },
          { customer_email: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { 'last_message.content': { $regex: search, $options: 'i' } }
        ];
      }

      const conversations = await Conversation.find(filter)
        .populate('customer_id', 'name email')
        .populate('assigned_to', 'name email')
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Conversation.countDocuments(filter);

      return {
        conversations,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_conversations: total,
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Error getting conversations: ${error.message}`);
    }
  }

  /**
   * Mark messages as read
   * @param {string} conversationId - Conversation ID
   * @param {string} readerType - "customer" or "store"
   * @returns {Promise<void>}
   */
  async markAsRead(conversationId, readerType) {
    try {
      // Mark conversation unread count as 0
      const updateField = readerType === "customer" ? "unread_count.customer" : "unread_count.store";
      
      await Conversation.findByIdAndUpdate(conversationId, {
        [updateField]: 0,
      });

      // Mark messages as read
      await Message.updateMany(
        { 
          conversation_id: conversationId, 
          sender_type: { $ne: readerType },
          is_read: false 
        },
        { 
          is_read: true, 
          read_at: new Date() 
        }
      );
    } catch (error) {
      throw new Error(`Error marking as read: ${error.message}`);
    }
  }

  /**
   * Update conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} - Updated conversation
   */
  async updateConversation(conversationId, updates) {
    try {
      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        updates,
        { new: true }
      ).populate([
        { path: 'customer_id', select: 'name email' },
        { path: 'assigned_to', select: 'name email' }
      ]);

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      return conversation;
    } catch (error) {
      throw new Error(`Error updating conversation: ${error.message}`);
    }
  }

  /**
   * Get conversation statistics
   * @returns {Promise<Object>} - Chat statistics
   */
  async getConversationStats() {
    try {
      const stats = await Conversation.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalUnread = await Conversation.aggregate([
        {
          $group: {
            _id: null,
            total_unread: { $sum: '$unread_count.store' }
          }
        }
      ]);

      const todayConversations = await Conversation.countDocuments({
        created_at: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });

      const result = {
        by_status: {},
        total_unread: totalUnread[0]?.total_unread || 0,
        today_conversations: todayConversations,
        total_conversations: await Conversation.countDocuments()
      };

      // Format status counts
      stats.forEach(stat => {
        result.by_status[stat._id] = stat.count;
      });

      // Ensure all statuses are present
      ['active', 'closed', 'pending'].forEach(status => {
        if (!result.by_status[status]) {
          result.by_status[status] = 0;
        }
      });

      return result;
    } catch (error) {
      throw new Error(`Error getting conversation stats: ${error.message}`);
    }
  }
}

module.exports = new ChatService(); 