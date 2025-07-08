const express = require("express");
const router = express.Router();
const { protect, authorize, optionalAuth } = require("../middleware/auth");
const chatController = require("../controllers/chatController");

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat system for customer support
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         customer_id:
 *           type: string
 *         session_id:
 *           type: string
 *         customer_name:
 *           type: string
 *         customer_email:
 *           type: string
 *         subject:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, closed, pending]
 *         last_message:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *             sender_type:
 *               type: string
 *             timestamp:
 *               type: string
 *               format: date-time
 *         unread_count:
 *           type: object
 *           properties:
 *             customer:
 *               type: integer
 *             store:
 *               type: integer
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         conversation_id:
 *           type: string
 *         sender_id:
 *           type: string
 *         sender_type:
 *           type: string
 *           enum: [customer, store, system]
 *         sender_name:
 *           type: string
 *         content:
 *           type: string
 *         message_type:
 *           type: string
 *           enum: [text, image, file, system_notification]
 *         is_read:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 */

// Customer routes (public with optional auth)
router.use(optionalAuth);

/**
 * @swagger
 * /api/chat/conversation:
 *   post:
 *     summary: Get or create conversation for customer
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Session ID for anonymous users
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "Product inquiry"
 *               initial_message:
 *                 type: string
 *                 example: "Hi, I have a question about this product..."
 *     responses:
 *       200:
 *         description: Conversation ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *                 message:
 *                   type: string
 *                   example: "Conversation ready"
 */
router.post("/conversation", chatController.getOrCreateConversation);

/**
 * @swagger
 * /api/chat/conversation/{id}:
 *   get:
 *     summary: Get conversation details
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: header
 *         name: x-session-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Session ID for anonymous users
 *     responses:
 *       200:
 *         description: Conversation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 */
router.get("/conversation/:id", chatController.getConversation);

/**
 * @swagger
 * /api/chat/conversation/{id}/messages:
 *   get:
 *     summary: Get messages in conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Messages per page
 *       - in: header
 *         name: x-session-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Session ID for anonymous users
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *                     pagination:
 *                       type: object
 */
router.get("/conversation/:id/messages", chatController.getMessages);

/**
 * @swagger
 * /api/chat/conversation/{id}/message:
 *   post:
 *     summary: Send message in conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: header
 *         name: x-session-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Session ID for anonymous users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Thank you for your help!"
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *                 message:
 *                   type: string
 *                   example: "Message sent successfully"
 */
router.post("/conversation/:id/message", chatController.sendMessage);

/**
 * @swagger
 * /api/chat/my-conversations:
 *   get:
 *     summary: Get customer's conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Session ID for anonymous users
 *     responses:
 *       200:
 *         description: Customer's conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 */
router.get("/my-conversations", chatController.getMyConversations);

// Admin routes (protected)
router.use(protect);
router.use(authorize("admin"));

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Get all conversations (Admin only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, closed, pending]
 *           default: active
 *         description: Filter by conversation status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Conversations per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Conversation'
 *                     pagination:
 *                       type: object
 */
router.get("/conversations", chatController.getConversations);

/**
 * @swagger
 * /api/chat/conversation/{id}/status:
 *   put:
 *     summary: Update conversation status (Admin only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, closed, pending]
 *               assigned_to:
 *                 type: string
 *                 description: User ID to assign conversation
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Conversation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *                 message:
 *                   type: string
 *                   example: "Conversation updated successfully"
 */
router.put("/conversation/:id/status", chatController.updateConversationStatus);

/**
 * @swagger
 * /api/chat/stats:
 *   get:
 *     summary: Get chat statistics (Admin only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     by_status:
 *                       type: object
 *                       properties:
 *                         active:
 *                           type: integer
 *                         closed:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                     total_unread:
 *                       type: integer
 *                     today_conversations:
 *                       type: integer
 *                     total_conversations:
 *                       type: integer
 *                     online_users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         admins:
 *                           type: integer
 *                         customers:
 *                           type: integer
 */
router.get("/stats", chatController.getStats);

module.exports = router; 