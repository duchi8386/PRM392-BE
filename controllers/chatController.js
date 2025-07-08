const chatService = require("../services/chatService");
const socketService = require("../config/socket");

// @desc    Get conversations for admin
// @route   GET /api/chat/conversations
// @access  Private (Admin only)
exports.getConversations = async (req, res) => {
  try {
    const { status = "active", page = 1, limit = 20, search = "" } = req.query;

    const result = await chatService.getConversations(
      status, 
      parseInt(page), 
      parseInt(limit), 
      search
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get or create conversation for customer
// @route   POST /api/chat/conversation
// @access  Public (with optional auth)
exports.getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user?._id;
    const sessionId = req.sessionId;
    const { subject = "General Inquiry", initial_message } = req.body;

    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: "User authentication or session is required",
      });
    }

    const customerName = req.user?.name || "Anonymous Customer";
    const customerEmail = req.user?.email || null;

    const conversation = await chatService.createOrGetConversation(
      userId,
      sessionId,
      customerName,
      customerEmail,
      subject
    );

    // Send initial message if provided
    if (initial_message && initial_message.trim()) {
      const message = await chatService.sendMessage(
        conversation._id,
        userId,
        "customer",
        initial_message.trim(),
        customerName
      );

      // Notify store admins via socket
      socketService.broadcastToAdmins("new_customer_message", {
        conversationId: conversation._id,
        message,
        conversation,
        customer: {
          name: customerName,
          id: userId || sessionId,
        }
      });
    }

    res.status(200).json({
      success: true,
      data: conversation,
      message: "Conversation ready",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get messages in conversation
// @route   GET /api/chat/conversation/:id/messages
// @access  Private or Public (conversation owner)
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to this conversation
    const userId = req.user?._id;
    const sessionId = req.sessionId;
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      // Verify conversation ownership for non-admin users
      const conversation = await chatService.verifyConversationAccess(id, userId, sessionId);
      if (!conversation) {
        return res.status(403).json({
          success: false,
          error: "Access denied to this conversation",
        });
      }
    }

    const result = await chatService.getMessages(id, parseInt(page), parseInt(limit));

    // Mark as read
    const readerType = isAdmin ? "store" : "customer";
    await chatService.markAsRead(id, readerType);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Send message
// @route   POST /api/chat/conversation/:id/message
// @access  Private or Public (conversation owner)
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Message content is required",
      });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Message too long (max 2000 characters)",
      });
    }

    const userId = req.user?._id;
    const sessionId = req.sessionId;
    const isAdmin = req.user?.role === "admin";
    const senderType = isAdmin ? "store" : "customer";
    const senderName = req.user?.name || "Anonymous Customer";

    // Verify access if not admin
    if (!isAdmin) {
      const conversation = await chatService.verifyConversationAccess(id, userId, sessionId);
      if (!conversation) {
        return res.status(403).json({
          success: false,
          error: "Access denied to this conversation",
        });
      }
    }

    const message = await chatService.sendMessage(
      id,
      userId,
      senderType,
      content.trim(),
      senderName
    );

    // Real-time notification via socket
    socketService.getIO().to(`conversation_${id}`).emit("new_message", {
      message,
      conversationId: id,
    });

    // Notify other party
    if (senderType === "customer") {
      socketService.broadcastToAdmins("new_customer_message", {
        conversationId: id,
        message,
        customer: {
          name: senderName,
          id: userId || sessionId,
        }
      });
    } else {
      // Notify customer if they're online
      if (userId) {
        socketService.sendToUser(userId, "new_store_message", {
          conversationId: id,
          message,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: message,
      message: "Message sent successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update conversation status
// @route   PUT /api/chat/conversation/:id/status
// @access  Private (Admin only)
exports.updateConversationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, priority, tags } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (assigned_to) updateData.assigned_to = assigned_to;
    if (priority) updateData.priority = priority;
    if (tags) updateData.tags = tags;

    const conversation = await chatService.updateConversation(id, updateData);

    // Notify customer if conversation closed
    if (status === "closed") {
      socketService.getIO().to(`conversation_${id}`).emit("conversation_closed", {
        conversationId: id,
        message: "This conversation has been closed by our support team.",
        closedBy: req.user.name,
      });

      // Send system message
      await chatService.sendMessage(
        id,
        req.user._id,
        "system",
        `Conversation closed by ${req.user.name}`,
        "System"
      );
    }

    // Notify if assigned
    if (assigned_to && assigned_to !== conversation.assigned_to?._id?.toString()) {
      socketService.sendToUser(assigned_to, "conversation_assigned", {
        conversationId: id,
        conversation,
        assignedBy: req.user.name,
      });
    }

    res.status(200).json({
      success: true,
      data: conversation,
      message: "Conversation updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get conversation stats for admin dashboard
// @route   GET /api/chat/stats
// @access  Private (Admin only)
exports.getStats = async (req, res) => {
  try {
    const stats = await chatService.getConversationStats();
    const onlineStats = socketService.getOnlineUsersCount();

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        online_users: onlineStats,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get single conversation details
// @route   GET /api/chat/conversation/:id
// @access  Private (Admin only) or Public (conversation owner)
exports.getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const sessionId = req.sessionId;
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      // Verify conversation ownership for non-admin users
      const conversation = await chatService.verifyConversationAccess(id, userId, sessionId);
      if (!conversation) {
        return res.status(403).json({
          success: false,
          error: "Access denied to this conversation",
        });
      }
      
      return res.status(200).json({
        success: true,
        data: conversation,
      });
    }

    // Admin can access any conversation
    const Conversation = require("../models/Conversation");
    const conversation = await Conversation.findById(id)
      .populate('customer_id', 'name email')
      .populate('assigned_to', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get customer's conversations
// @route   GET /api/chat/my-conversations
// @access  Private or Public (with session)
exports.getMyConversations = async (req, res) => {
  try {
    const userId = req.user?._id;
    const sessionId = req.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: "User authentication or session is required",
      });
    }

    const Conversation = require("../models/Conversation");
    
    const query = userId 
      ? { customer_id: userId }
      : { session_id: sessionId };

    const conversations = await Conversation.find(query)
      .populate('assigned_to', 'name email')
      .sort({ updated_at: -1 });

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}; 