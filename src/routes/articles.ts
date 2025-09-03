import { Router } from 'express';
import { ArticleController } from '../controller/articleController';
import { asyncHandler } from '../middleware';

const router = Router();
const articleController = new ArticleController();

/**
 * @swagger
 * /articles:
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - author
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 example: "Introduction to Machine Learning"
 *               content:
 *                 type: string
 *                 minLength: 50
 *                 example: "Machine learning is a subset of artificial intelligence..."
 *               author:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "John Doe"
 *               summary:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Optional summary - will be auto-generated if empty"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["machine-learning", "ai", "technology"]
 *     responses:
 *       201:
 *         description: Article created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Article'
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         generated:
 *                           type: boolean
 *                         provider:
 *                           type: string
 *                         model:
 *                           type: string
 *                         method:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/',
  asyncHandler(articleController.createArticle.bind(articleController))
);

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Get paginated list of articles with search and filtering
 *     tags: [Articles]
 *     parameters:
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/OffsetParam'
 *       - $ref: '#/components/parameters/PageParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title, content, or author
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author name
 *     responses:
 *       200:
 *         description: Articles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Article'
 *                     filters:
 *                       type: object
 *                       properties:
 *                         search:
 *                           type: string
 *                         tags:
 *                           type: string
 *                         author:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/',
  asyncHandler(articleController.getArticles.bind(articleController))
);

/**
 * @swagger
 * /articles/stats:
 *   get:
 *     summary: Get article statistics
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: Article statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalArticles:
 *                           type: number
 *                         totalAuthors:
 *                           type: number
 *                         averageContentLength:
 *                           type: number
 *                         topTags:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               count:
 *                                 type: number
 *                         recentArticles:
 *                           type: number
 *                         lastWeekGrowth:
 *                           type: number
 *                         articlesWithSummaries:
 *                           type: number
 *                         summaryCompletionRate:
 *                           type: number
 *                           description: Percentage of articles with proper summaries
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/stats',
  asyncHandler(articleController.getArticleStats.bind(articleController))
);

/**
 * @swagger
 * /articles/providers/status:
 *   get:
 *     summary: Get AI provider status for debugging
 *     tags: [Articles, Summary]
 *     responses:
 *       200:
 *         description: Provider status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           available:
 *                             type: boolean
 *                           error:
 *                             type: string
 *                           model:
 *                             type: string
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/providers/status',
  asyncHandler(articleController.getProviderStatus.bind(articleController))
);

/**
 * @swagger
 * /articles/bulk/regenerate-summaries:
 *   post:
 *     summary: Bulk regenerate summaries for articles without proper summaries
 *     tags: [Articles, Summary]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 5
 *                 description: Number of articles to process in one batch
 *               maxSentences:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 3
 *                 description: Maximum sentences in generated summaries
 *     responses:
 *       200:
 *         description: Bulk regeneration completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         updated:
 *                           type: number
 *                         failed:
 *                           type: number
 *                         results:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               success:
 *                                 type: boolean
 *                               id:
 *                                 type: string
 *                               metadata:
 *                                 type: object
 *                                 properties:
 *                                   provider:
 *                                     type: string
 *                                   model:
 *                                     type: string
 *                                   method:
 *                                     type: string
 *                               error:
 *                                 type: string
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/bulk/regenerate-summaries',
  asyncHandler(articleController.bulkRegenerateSummaries.bind(articleController))
);

/**
 * @swagger
 * /articles/tags/{tags}:
 *   get:
 *     summary: Get articles by tags
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: tags
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags
 *         example: "machine-learning,ai,technology"
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/OffsetParam'
 *     responses:
 *       200:
 *         description: Articles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Article'
 *                     filters:
 *                       type: object
 *                       properties:
 *                         tags:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/tags/:tags',
  asyncHandler(articleController.getArticlesByTags.bind(articleController))
);

/**
 * @swagger
 * /articles/{id}:
 *   put:
 *     summary: Update article by ID
 *     tags: [Articles]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 minLength: 50
 *               author:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               summary:
 *                 type: string
 *                 maxLength: 500
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Article updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Article'
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         generated:
 *                           type: boolean
 *                         provider:
 *                           type: string
 *                         model:
 *                           type: string
 *                         method:
 *                           type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put(
  '/:id',
  asyncHandler(articleController.updateArticle.bind(articleController))
);

/**
 * @swagger
 * /articles/{id}/summary/regenerate:
 *   post:
 *     summary: Regenerate summary for an article
 *     tags: [Articles, Summary]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxSentences:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 3
 *                 description: Maximum sentences in generated summary
 *     responses:
 *       200:
 *         description: Summary regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Article'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:id/summary/regenerate',
  asyncHandler(articleController.regenerateSummary.bind(articleController))
);

/**
 * @swagger
 * /articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Article retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Article'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id',
  asyncHandler(articleController.getArticleById.bind(articleController))
);

/**
 * @swagger
 * /articles/{id}:
 *   delete:
 *     summary: Delete article by ID
 *     tags: [Articles]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Article deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:id',
  asyncHandler(articleController.deleteArticle.bind(articleController))
);

export default router;