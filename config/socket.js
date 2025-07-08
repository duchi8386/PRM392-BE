const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const chatService = require("../services/chatService");

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // userId -> socketId
    this.onlineAdmins = new Set(); // Set of admin socket IDs
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL || "http://localhost:3000",
          process.env.MAIN_APP_URL || "http://localhost:5000",
          "http://localhost:3001",
          "http://localhost:3000",
          "http://localhost:4200",
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Authentication middleware for socket
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const sessionId = socket.handshake.auth.sessionId;

        console.log('🔌 Socket connection attempt:', {
          hasToken: !!token,
          hasSessionId: !!sessionId,
          socketId: socket.id
        });

        if (token) {
          // Authenticated user
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id);
          
          if (user) {
            socket.userId = user._id.toString();
            socket.userType = user.role; // "customer" or "admin"
            socket.userName = user.name;
            socket.userEmail = user.email;
            console.log('✅ Authenticated user connected:', {
              userId: socket.userId,
              userType: socket.userType,
              userName: socket.userName
            });
          }
        } else if (sessionId) {
          // Anonymous user
          socket.sessionId = sessionId;
          socket.userType = "customer";
          socket.userName = "Anonymous Customer";
          console.log('👤 Anonymous user connected:', {
            sessionId: socket.sessionId
          });
        }

        next();
      } catch (error) {
        console.error("❌ Socket auth error:", error.message);
        next(new Error("Authentication failed"));
      }
    });

    this.io.on("connection", (socket) => {
      console.log(`🔗 User connected: ${socket.userId || socket.sessionId} (${socket.userType})`);

      // Store online user
      if (socket.userId) {
        this.onlineUsers.set(socket.userId, socket.id);
        
        // Track admin users
        if (socket.userType === "admin") {
          this.onlineAdmins.add(socket.id);
          console.log(`👨‍💼 Admin online: ${socket.userName}`);
        }
      }

      // Join conversation room
      socket.on("join_conversation", async (data) => {
        try {
          const { conversationId } = data;
          socket.join(`conversation_${conversationId}`);
          console.log(`📝 User joined conversation: ${conversationId}`);

          // Mark messages as read
          const readerType = socket.userType === "admin" ? "store" : "customer";
          await chatService.markAsRead(conversationId, readerType);

          // Notify read status to other participants
          socket.to(`conversation_${conversationId}`).emit("messages_read", {
            conversationId,
            readerType,
            readBy: socket.userName,
          });

          socket.emit("joined_conversation", {
            conversationId,
            success: true,
          });

        } catch (error) {
          console.error("❌ Error joining conversation:", error.message);
          socket.emit("error", { 
            event: "join_conversation",
            message: error.message 
          });
        }
      });

      // Leave conversation room
      socket.on("leave_conversation", (data) => {
        const { conversationId } = data;
        socket.leave(`conversation_${conversationId}`);
        console.log(`📤 User left conversation: ${conversationId}`);
      });

      // Send message
      socket.on("send_message", async (data) => {
        try {
          const { conversationId, content } = data;

          if (!content || content.trim().length === 0) {
            socket.emit("error", { 
              event: "send_message",
              message: "Message content is required" 
            });
            return;
          }

          console.log(`💬 Sending message in conversation ${conversationId} from ${socket.userName}`);

          const message = await chatService.sendMessage(
            conversationId,
            socket.userId,
            socket.userType === "admin" ? "store" : "customer",
            content.trim(),
            socket.userName
          );

          // Emit to conversation room
          this.io.to(`conversation_${conversationId}`).emit("new_message", {
            message,
            conversationId,
          });

          // Emit to store admins if customer sent message
          if (socket.userType === "customer") {
            this.broadcastToAdmins("new_customer_message", {
              conversationId,
              message,
              customer: {
                name: socket.userName,
                id: socket.userId || socket.sessionId,
              }
            });
          }

          socket.emit("message_sent", {
            messageId: message._id,
            conversationId,
            success: true,
          });

        } catch (error) {
          console.error("❌ Error sending message:", error.message);
          socket.emit("error", { 
            event: "send_message",
            message: error.message 
          });
        }
      });

      // Start new conversation
      socket.on("start_conversation", async (data) => {
        try {
          const { subject = "General Inquiry", initialMessage } = data;

          console.log(`🆕 Starting new conversation for ${socket.userName}`);

          const conversation = await chatService.createOrGetConversation(
            socket.userId,
            socket.sessionId,
            socket.userName,
            socket.userEmail,
            subject
          );

          // Join the conversation room
          socket.join(`conversation_${conversation._id}`);

          if (initialMessage && initialMessage.trim()) {
            const message = await chatService.sendMessage(
              conversation._id,
              socket.userId,
              "customer",
              initialMessage.trim(),
              socket.userName
            );

            // Notify admins
            this.broadcastToAdmins("new_customer_message", {
              conversationId: conversation._id,
              message,
              conversation,
              customer: {
                name: socket.userName,
                id: socket.userId || socket.sessionId,
              }
            });
          }

          socket.emit("conversation_created", {
            conversation,
            success: true,
          });

        } catch (error) {
          console.error("❌ Error starting conversation:", error.message);
          socket.emit("error", { 
            event: "start_conversation",
            message: error.message 
          });
        }
      });

      // Typing indicator
      socket.on("typing", (data) => {
        const { conversationId, isTyping } = data;
        
        socket.to(`conversation_${conversationId}`).emit("user_typing", {
          userId: socket.userId || socket.sessionId,
          userName: socket.userName,
          userType: socket.userType,
          isTyping: isTyping,
          conversationId,
        });
      });

      // Get online status
      socket.on("get_online_status", (data) => {
        const { userIds } = data;
        const onlineStatus = {};
        
        userIds.forEach(userId => {
          onlineStatus[userId] = this.onlineUsers.has(userId);
        });

        socket.emit("online_status", onlineStatus);
      });

      // Admin: Get conversation stats
      socket.on("get_chat_stats", async () => {
        if (socket.userType === "admin") {
          try {
            const stats = await chatService.getConversationStats();
            socket.emit("chat_stats", {
              stats,
              online_admins: this.onlineAdmins.size,
            });
          } catch (error) {
            socket.emit("error", { 
              event: "get_chat_stats",
              message: error.message 
            });
          }
        }
      });

      // Disconnect
      socket.on("disconnect", (reason) => {
        console.log(`💔 User disconnected: ${socket.userId || socket.sessionId} (${reason})`);
        
        if (socket.userId) {
          this.onlineUsers.delete(socket.userId);
        }

        if (socket.userType === "admin") {
          this.onlineAdmins.delete(socket.id);
          console.log(`👨‍💼 Admin offline: ${socket.userName}`);
        }

        // Notify typing stopped for all conversations
        socket.broadcast.emit("user_typing", {
          userId: socket.userId || socket.sessionId,
          userName: socket.userName,
          userType: socket.userType,
          isTyping: false,
        });
      });

      // Error handling
      socket.on("error", (error) => {
        console.error("🚫 Socket error:", error);
      });
    });

    console.log("✅ Socket.IO chat system initialized");
    return this.io;
  }

  getIO() {
    if (!this.io) {
      throw new Error("Socket.IO not initialized");
    }
    return this.io;
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Broadcast to all store admins
  broadcastToAdmins(event, data) {
    this.onlineAdmins.forEach(socketId => {
      this.io.to(socketId).emit(event, data);
    });
  }

  // Get online users count
  getOnlineUsersCount() {
    return {
      total: this.onlineUsers.size,
      admins: this.onlineAdmins.size,
      customers: this.onlineUsers.size - this.onlineAdmins.size,
    };
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }
}

module.exports = new SocketService(); 