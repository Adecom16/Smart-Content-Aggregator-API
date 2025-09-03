import Joi from 'joi';

// Article validation schemas
export const createArticleSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200).required(),
  content: Joi.string().trim().min(50).required(),
  author: Joi.string().trim().min(2).max(100).required(),
  summary: Joi.string().trim().max(500).optional().allow('', null),
  tags: Joi.array().items(Joi.string().trim().lowercase().max(30)).optional()
});

export const getArticlesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  page: Joi.number().integer().min(1).optional()
});

// User validation schemas
export const createUserSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30).required(),
  interests: Joi.array().items(Joi.string().trim().lowercase().max(50)).optional()
});

// Interaction validation schemas
export const createInteractionSchema = Joi.object({
  user_id: Joi.string().hex().length(24).required(),
  article_id: Joi.string().hex().length(24).required(),
  interaction_type: Joi.string().valid('view', 'like', 'share', 'comment').required()
});

// MongoDB ObjectId validation
export const objectIdSchema = Joi.string().hex().length(24);

// Recommendation validation
export const recommendationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10)
});