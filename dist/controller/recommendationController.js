"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationController = void 0;
const recommendationService_1 = require("../services/recommendationService");
const User_1 = __importDefault(require("../models/User"));
const Interaction_1 = __importDefault(require("../models/Interaction"));
const recommendationService = new recommendationService_1.RecommendationService();
class RecommendationController {
    async getRecommendations(req, res) {
        const { user_id } = req.params;
        const { limit = 10 } = req.query;
        try {
            const startTime = Date.now();
            const recommendations = await recommendationService.getRecommendations(user_id, Number(limit));
            const processingTime = Date.now() - startTime;
            const formattedRecommendations = recommendations.map(rec => ({
                article: rec.article,
                score: Math.round(rec.score * 100) / 100,
                reasons: rec.reasons
            }));
            res.json({
                success: true,
                data: {
                    userId: user_id,
                    recommendations: formattedRecommendations,
                    count: recommendations.length,
                    processingTimeMs: processingTime
                },
                message: 'Recommendations generated successfully'
            });
        }
        catch (error) {
            if (error.message === 'User not found') {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            throw error;
        }
    }
    async getTrendingArticles(req, res) {
        const { limit = 10 } = req.query;
        try {
            const startTime = Date.now();
            const trendingArticles = await recommendationService.getTrendingArticles(Number(limit));
            const processingTime = Date.now() - startTime;
            res.json({
                success: true,
                data: {
                    articles: trendingArticles,
                    count: trendingArticles.length,
                    processingTimeMs: processingTime
                },
                message: 'Trending articles retrieved successfully'
            });
        }
        catch (error) {
            throw error;
        }
    }
    async getPopularArticles(req, res) {
        const { limit = 10 } = req.query;
        try {
            const startTime = Date.now();
            const popularArticles = await recommendationService.getTrendingArticles(Number(limit));
            const processingTime = Date.now() - startTime;
            res.json({
                success: true,
                data: {
                    articles: popularArticles,
                    count: popularArticles.length,
                    processingTimeMs: processingTime
                },
                message: 'Popular articles retrieved successfully'
            });
        }
        catch (error) {
            throw error;
        }
    }
    async getRecommendationInsights(req, res) {
        const { user_id } = req.params;
        try {
            const user = await User_1.default.findById(user_id);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            const userInteractions = await Interaction_1.default.find({ userId: user_id })
                .populate('articleId', 'title tags author')
                .populate('articleId', 'title tags author')
                .limit(50)
                .sort({ createdAt: -1 });
            const interactionsByType = userInteractions.reduce((acc, interaction) => {
                acc[interaction.interactionType] = (acc[interaction.interactionType] || 0) + 1;
                return acc;
            }, {});
            const tagPreferences = userInteractions
                .filter(interaction => interaction.articleId?.tags)
                .flatMap(interaction => interaction.articleId.tags)
                .filter((tag) => typeof tag === 'string')
                .reduce((acc, tag) => {
                acc[tag] = (acc[tag] || 0) + 1;
                return acc;
            }, {});
            const insights = {
                user: {
                    id: user_id,
                    username: user.username,
                    explicitInterests: user.interests || [],
                    memberSince: user.createdAt
                },
                activitySummary: {
                    totalInteractions: userInteractions.length,
                    interactionsByType: interactionsByType,
                    mostActiveDay: this.getMostActiveDay(userInteractions)
                },
                preferences: {
                    derivedTagPreferences: Object.entries(tagPreferences)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([tag, count]) => ({ tag, frequency: count })),
                    topAuthors: this.getTopAuthors(userInteractions)
                },
                recommendations: {
                    lastGenerated: new Date(),
                    algorithmsUsed: ['interest_matching', 'popularity_score', 'content_freshness', 'author_reputation']
                }
            };
            res.json({
                success: true,
                data: insights,
                message: 'Recommendation insights retrieved successfully'
            });
        }
        catch (error) {
            throw error;
        }
    }
    getMostActiveDay(interactions) {
        const dayCount = interactions.reduce((acc, interaction) => {
            const day = interaction.createdAt.toISOString().split('T')[0];
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});
        const mostActiveDay = Object.entries(dayCount)
            .sort(([, a], [, b]) => b - a)[0];
        return mostActiveDay ? mostActiveDay[0] : 'No activity';
    }
    getTopAuthors(interactions) {
        const authorCount = interactions
            .filter(interaction => interaction.articleId?.author)
            .reduce((acc, interaction) => {
            const author = interaction.articleId.author;
            acc[author] = (acc[author] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(authorCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([author, count]) => ({ author, interactions: count }));
    }
}
exports.RecommendationController = RecommendationController;
