"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const interactionController_1 = require("../controller/interactionController");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const interactionController = new interactionController_1.InteractionController();
/**
 * @swagger
 * components:
 *   schemas:
 *     InteractionRequest:
 *       type: object
 *       required:
 *         - user_id
 *         - article_id
 *         - interaction_type
 *       properties:
 *         user_id:
 *           type: string
 *           description: MongoDB ObjectId of the user
 *           example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *         article_id:
 *           type: string
 *           description: MongoDB ObjectId of the article
 *           example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *         interaction_type:
 *           type: string
 *           enum: [view, like, share, comment]
 *           description: Type of interaction
 *           example: "like"
 *         content:
 *           type: string
 *           description: Required for comment interactions
 *           maxLength: 1000
 *           example: "This is a great article about data science!"
 *         shareMetadata:
 *           type: object
 *           description: Required for share interactions
 *           properties:
 *             platform:
 *               type: string
 *               enum: [twitter, facebook, linkedin, email, copy_link, whatsapp]
 *               example: "twitter"
 *             message:
 *               type: string
 *               maxLength: 500
 *               example: "Check out this amazing article!"
 *     InteractionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *         message:
 *           type: string
 *           example: "Interaction recorded successfully"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error description"
 */
/**
 * @swagger
 * /interactions/article/{articleId}/shares:
 *   get:
 *     summary: Get share analytics for an article
 *     description: Retrieve detailed sharing statistics including platform breakdown
 *     tags: [Interactions]
 *     parameters:
 *       - name: articleId
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the article
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       200:
 *         description: Share analytics retrieved successfully
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
 *                     articleId:
 *                       type: string
 *                       example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *                     totalShares:
 *                       type: integer
 *                       example: 25
 *                     sharesByPlatform:
 *                       type: object
 *                       example: { "twitter": 10, "facebook": 8, "linkedin": 7 }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/article/:articleId/shares', (0, middleware_1.asyncHandler)(interactionController.getArticleShareStats.bind(interactionController)));
/**
 * @swagger
 * /interactions:
 *   post:
 *     summary: Record a user interaction with an article
 *     description: Create a new interaction (like, share, comment, or view) for a user and article
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InteractionRequest'
 *     responses:
 *       201:
 *         description: Interaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InteractionResponse'
 *       400:
 *         description: Bad request - missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User or article not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Duplicate interaction (user already liked/shared/viewed this article)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', (0, middleware_1.asyncHandler)(interactionController.createInteraction.bind(interactionController)));
/**
 * @swagger
 * /interactions/remove:
 *   delete:
 *     summary: Remove a user interaction (unlike, unshare)
 *     description: Remove an existing interaction (cannot remove comments - use specific delete endpoint)
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - article_id
 *               - interaction_type
 *             properties:
 *               user_id:
 *                 type: string
 *                 example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *               article_id:
 *                 type: string
 *                 example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *               interaction_type:
 *                 type: string
 *                 enum: [like, share, view]
 *                 example: "like"
 *     responses:
 *       200:
 *         description: Interaction removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InteractionResponse'
 *       400:
 *         description: Bad request - cannot remove comments via this endpoint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Interaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.delete('/remove', (0, middleware_1.asyncHandler)(interactionController.removeInteraction.bind(interactionController)));
/**
 * @swagger
 * /interactions/user/{userId}/article/{articleId}:
 *   get:
 *     summary: Get user's interaction status for a specific article
 *     description: Retrieve all interactions between a specific user and article
 *     tags: [Interactions]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the user
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *       - name: articleId
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the article
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       200:
 *         description: User interactions retrieved successfully
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
 *                     userId:
 *                       type: string
 *                       example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *                     articleId:
 *                       type: string
 *                       example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *                     interactions:
 *                       type: object
 *                       properties:
 *                         liked:
 *                           type: boolean
 *                           example: true
 *                         shared:
 *                           type: boolean
 *                           example: false
 *                         viewed:
 *                           type: boolean
 *                           example: true
 *                         comments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               content:
 *                                 type: string
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId/article/:articleId', (0, middleware_1.asyncHandler)(interactionController.getUserArticleInteractions.bind(interactionController)));
/**
 * @swagger
 * /interactions/user/{userId}:
 *   get:
 *     summary: Get interactions for a specific user
 *     description: Retrieve paginated list of all interactions for a user, optionally filtered by type
 *     tags: [Interactions]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the user
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *       - name: limit
 *         in: query
 *         description: Maximum number of results to return
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *       - name: offset
 *         in: query
 *         description: Number of results to skip
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *       - name: interaction_type
 *         in: query
 *         description: Filter by interaction type
 *         schema:
 *           type: string
 *           enum: [view, like, share, comment]
 *     responses:
 *       200:
 *         description: User interactions retrieved successfully
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
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', (0, middleware_1.asyncHandler)(interactionController.getUserInteractions.bind(interactionController)));
/**
 * @swagger
 * /interactions/article/{articleId}:
 *   get:
 *     summary: Get interactions for a specific article
 *     description: Retrieve paginated list of all interactions for an article, optionally filtered by type
 *     tags: [Interactions]
 *     parameters:
 *       - name: articleId
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the article
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *       - name: limit
 *         in: query
 *         description: Maximum number of results to return
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *       - name: offset
 *         in: query
 *         description: Number of results to skip
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *       - name: interaction_type
 *         in: query
 *         description: Filter by interaction type
 *         schema:
 *           type: string
 *           enum: [view, like, share, comment]
 *     responses:
 *       200:
 *         description: Article interactions retrieved successfully
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
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/article/:articleId', (0, middleware_1.asyncHandler)(interactionController.getArticleInteractions.bind(interactionController)));
/**
 * @swagger
 * /interactions/article/{articleId}/comments:
 *   get:
 *     summary: Get comments for a specific article
 *     description: Retrieve paginated list of comments for an article
 *     tags: [Interactions]
 *     parameters:
 *       - name: articleId
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the article
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *       - name: limit
 *         in: query
 *         description: Maximum number of comments to return
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *       - name: offset
 *         in: query
 *         description: Number of comments to skip
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       userId:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/article/:articleId/comments', (0, middleware_1.asyncHandler)(interactionController.getArticleComments.bind(interactionController)));
/**
 * @swagger
 * /interactions/article/{articleId}/stats:
 *   get:
 *     summary: Get interaction statistics for an article
 *     description: Get comprehensive statistics showing counts of all interaction types
 *     tags: [Interactions]
 *     parameters:
 *       - name: articleId
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the article
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     articleId:
 *                       type: string
 *                       example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *                     interactions:
 *                       type: object
 *                       properties:
 *                         view:
 *                           type: integer
 *                           example: 1250
 *                         like:
 *                           type: integer
 *                           example: 89
 *                         share:
 *                           type: integer
 *                           example: 25
 *                         comment:
 *                           type: integer
 *                           example: 42
 *                     totalInteractions:
 *                       type: integer
 *                       example: 1406
 *       500:
 *         description: Internal server error
 */
router.get('/article/:articleId/stats', (0, middleware_1.asyncHandler)(interactionController.getArticleStats.bind(interactionController)));
/**
 * @swagger
 * /interactions/{id}:
 *   put:
 *     summary: Update a comment
 *     description: Update the content of an existing comment
 *     tags: [Interactions]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the interaction (comment)
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d3"
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
 *                 maxLength: 1000
 *                 minLength: 1
 *                 description: Updated comment content
 *                 example: "Updated comment content with more insights"
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InteractionResponse'
 *       400:
 *         description: Bad request - missing or invalid content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.put('/:id', (0, middleware_1.asyncHandler)(interactionController.updateComment.bind(interactionController)));
/**
 * @swagger
 * /interactions/{id}:
 *   delete:
 *     summary: Delete a specific interaction
 *     description: Delete a specific interaction by its ID (primarily used for comments)
 *     tags: [Interactions]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the interaction to delete
 *         schema:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d3"
 *     responses:
 *       200:
 *         description: Interaction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Interaction deleted successfully"
 *       404:
 *         description: Interaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', (0, middleware_1.asyncHandler)(interactionController.deleteInteraction.bind(interactionController)));
exports.default = router;
