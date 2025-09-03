"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = void 0;
const Article_1 = __importDefault(require("../models/Article"));
const User_1 = __importDefault(require("../models/User"));
const Interaction_1 = __importDefault(require("../models/Interaction"));
class RecommendationService {
    async getRecommendations(userId, limit = 10) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const userInteractions = await Interaction_1.default.find({ userId }).select('articleId');
        const interactedArticleIds = userInteractions.map(interaction => interaction.articleId);
        const candidateArticles = await Article_1.default.find({
            _id: { $nin: interactedArticleIds }
        }).limit(limit * 2);
        if (candidateArticles.length === 0) {
            return [];
        }
        const recommendations = await Promise.all(candidateArticles.map(async (article) => {
            const score = await this.calculateRecommendationScore(user, article);
            return score;
        }));
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    async calculateRecommendationScore(user, article) {
        let score = 0;
        const reasons = [];
        const interestScore = this.calculateInterestScore(user.interests, article.tags || []);
        score += interestScore * 0.4;
        if (interestScore > 0) {
            reasons.push(`Matches your interests: ${this.getMatchingInterests(user.interests, article.tags || []).join(', ')}`);
        }
        const popularityScore = await this.calculatePopularityScore(article._id);
        score += popularityScore * 0.3;
        if (popularityScore > 0.7) {
            reasons.push('Popular among users');
        }
        const freshnessScore = this.calculateFreshnessScore(article.createdAt);
        score += freshnessScore * 0.2;
        if (freshnessScore > 0.8) {
            reasons.push('Recent content');
        }
        const authorScore = await this.calculateAuthorScore(article.author);
        score += authorScore * 0.1;
        if (authorScore > 0.7) {
            reasons.push('From popular author');
        }
        if (reasons.length === 0) {
            reasons.push('General recommendation');
        }
        return {
            article,
            score: Math.min(score, 1),
            reasons
        };
    }
    calculateInterestScore(userInterests, articleTags) {
        if (userInterests.length === 0 || articleTags.length === 0) {
            return 0;
        }
        const matchingTags = userInterests.filter(interest => articleTags.some(tag => tag.includes(interest) || interest.includes(tag)));
        return matchingTags.length / userInterests.length;
    }
    getMatchingInterests(userInterests, articleTags) {
        return userInterests.filter(interest => articleTags.some(tag => tag.includes(interest) || interest.includes(tag)));
    }
    async calculatePopularityScore(articleId) {
        const interactionCounts = await Interaction_1.default.aggregate([
            { $match: { articleId } },
            {
                $group: {
                    _id: '$interactionType',
                    count: { $sum: 1 }
                }
            }
        ]);
        const weights = { view: 1, like: 3, share: 5, comment: 4 };
        let totalScore = 0;
        interactionCounts.forEach(({ _id: type, count }) => {
            totalScore += count * (weights[type] || 1);
        });
        return Math.min(totalScore / 100, 1);
    }
    calculateFreshnessScore(createdAt) {
        const now = new Date();
        const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays <= 1)
            return 1.0;
        if (ageInDays <= 7)
            return 0.9;
        if (ageInDays <= 30)
            return 0.7;
        if (ageInDays <= 90)
            return 0.4;
        return 0.2;
    }
    async calculateAuthorScore(author) {
        const authorArticles = await Article_1.default.find({ author }).limit(10);
        if (authorArticles.length === 0) {
            return 0.5;
        }
        const scores = await Promise.all(authorArticles.map(article => this.calculatePopularityScore(article._id)));
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return averageScore;
    }
    async getTrendingArticles(limit = 10) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const trending = await Interaction_1.default.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            {
                $group: {
                    _id: '$articleId',
                    interactionCount: { $sum: 1 },
                    likeCount: {
                        $sum: { $cond: [{ $eq: ['$interactionType', 'like'] }, 1, 0] }
                    }
                }
            },
            { $sort: { likeCount: -1, interactionCount: -1 } },
            { $limit: limit }
        ]);
        const articleIds = trending.map(item => item._id);
        return await Article_1.default.find({ _id: { $in: articleIds } });
    }
}
exports.RecommendationService = RecommendationService;
