"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recommendationController_1 = require("../controller/recommendationController");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const recommendationController = new recommendationController_1.RecommendationController();
/**
 * @swagger
 * /recommendations/user/{user_id}:
 *   get:
 *     summary: Get personalized recommendations for a user
 *     tags: [Recommendations]
 *     parameters:
 *       - name: user_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Maximum number of recommendations to return
 */
router.get('/user/:user_id', (0, middleware_1.asyncHandler)(recommendationController.getRecommendations.bind(recommendationController)));
/**
 * @swagger
 * /recommendations/trending:
 *   get:
 *     summary: Get trending articles based on recent interactions
 *     tags: [Recommendations]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Maximum number of trending articles to return
 */
router.get('/trending', (0, middleware_1.asyncHandler)(recommendationController.getTrendingArticles.bind(recommendationController)));
/**
 * @swagger
 * /recommendations/popular:
 *   get:
 *     summary: Get popular articles of all time
 *     tags: [Recommendations]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Maximum number of popular articles to return
 */
router.get('/popular', (0, middleware_1.asyncHandler)(recommendationController.getPopularArticles.bind(recommendationController)));
/**
 * @swagger
 * /recommendations/user/{user_id}/insights:
 *   get:
 *     summary: Get recommendation insights and user behavior analysis
 *     tags: [Recommendations]
 *     parameters:
 *       - name: user_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *     description: Returns detailed insights about user preferences, activity patterns, and recommendation rationale for debugging and analytics purposes
 */
router.get('/user/:user_id/insights', (0, middleware_1.asyncHandler)(recommendationController.getRecommendationInsights.bind(recommendationController)));
exports.default = router;
