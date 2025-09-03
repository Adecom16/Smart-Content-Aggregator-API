"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationSchema = exports.objectIdSchema = exports.createInteractionSchema = exports.createUserSchema = exports.getArticlesSchema = exports.createArticleSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Article validation schemas
exports.createArticleSchema = joi_1.default.object({
    title: joi_1.default.string().trim().min(5).max(200).required(),
    content: joi_1.default.string().trim().min(50).required(),
    author: joi_1.default.string().trim().min(2).max(100).required(),
    summary: joi_1.default.string().trim().max(500).optional().allow('', null),
    tags: joi_1.default.array().items(joi_1.default.string().trim().lowercase().max(30)).optional()
});
exports.getArticlesSchema = joi_1.default.object({
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    offset: joi_1.default.number().integer().min(0).default(0),
    page: joi_1.default.number().integer().min(1).optional()
});
// User validation schemas
exports.createUserSchema = joi_1.default.object({
    username: joi_1.default.string().trim().alphanum().min(3).max(30).required(),
    interests: joi_1.default.array().items(joi_1.default.string().trim().lowercase().max(50)).optional()
});
// Interaction validation schemas
exports.createInteractionSchema = joi_1.default.object({
    user_id: joi_1.default.string().hex().length(24).required(),
    article_id: joi_1.default.string().hex().length(24).required(),
    interaction_type: joi_1.default.string().valid('view', 'like', 'share', 'comment').required()
});
// MongoDB ObjectId validation
exports.objectIdSchema = joi_1.default.string().hex().length(24);
// Recommendation validation
exports.recommendationSchema = joi_1.default.object({
    limit: joi_1.default.number().integer().min(1).max(50).default(10)
});
