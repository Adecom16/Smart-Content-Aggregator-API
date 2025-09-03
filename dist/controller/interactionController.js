"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionController = void 0;
const Interaction_1 = __importDefault(require("../models/Interaction"));
const User_1 = __importDefault(require("../models/User"));
const Article_1 = __importDefault(require("../models/Article"));
class InteractionController {
    async getArticleShareStats(req, res) {
        const { articleId } = req.params;
        try {
            const shareStats = await Interaction_1.default.aggregate([
                {
                    $match: {
                        articleId: articleId,
                        interactionType: 'share'
                    }
                },
                {
                    $group: {
                        _id: '$shareMetadata.platform',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);
            const totalShares = shareStats.reduce((sum, stat) => sum + stat.count, 0);
            res.json({
                success: true,
                data: {
                    articleId,
                    totalShares,
                    sharesByPlatform: shareStats.reduce((acc, stat) => {
                        acc[stat._id] = stat.count;
                        return acc;
                    }, {})
                }
            });
        }
        catch (error) {
            throw error;
        }
    }
    async createInteraction(req, res) {
        const { user_id, article_id, interaction_type, content, shareMetadata } = req.body;
        try {
            const userExists = await User_1.default.findById(user_id);
            if (!userExists) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            const articleExists = await Article_1.default.findById(article_id);
            if (!articleExists) {
                res.status(404).json({
                    success: false,
                    message: 'Article not found'
                });
                return;
            }
            if (interaction_type === 'comment' && !content?.trim()) {
                res.status(400).json({
                    success: false,
                    message: 'Comment content is required'
                });
                return;
            }
            if (interaction_type === 'share' && (!shareMetadata || !shareMetadata.platform)) {
                res.status(400).json({
                    success: false,
                    message: 'Share platform is required for share interactions'
                });
                return;
            }
            const interactionData = {
                userId: user_id,
                articleId: article_id,
                interactionType: interaction_type
            };
            if (interaction_type === 'comment') {
                interactionData.content = content.trim();
            }
            if (interaction_type === 'share' && shareMetadata) {
                interactionData.shareMetadata = shareMetadata;
            }
            const interaction = new Interaction_1.default(interactionData);
            const savedInteraction = await interaction.save();
            await savedInteraction.populate('userId', 'username');
            res.status(201).json({
                success: true,
                data: savedInteraction,
                message: `${interaction_type.charAt(0).toUpperCase() + interaction_type.slice(1)} recorded successfully`
            });
        }
        catch (error) {
            if (error.code === 11000) {
                res.status(409).json({
                    success: false,
                    message: `You have already ${interaction_type}d this article`
                });
                return;
            }
            throw error;
        }
    }
    async removeInteraction(req, res) {
        const { user_id, article_id, interaction_type } = req.body;
        if (interaction_type === 'comment') {
            res.status(400).json({
                success: false,
                message: 'Use delete endpoint to remove specific comments'
            });
            return;
        }
        try {
            const interaction = await Interaction_1.default.findOneAndDelete({
                userId: user_id,
                articleId: article_id,
                interactionType: interaction_type
            });
            if (!interaction) {
                res.status(404).json({
                    success: false,
                    message: `No ${interaction_type} found to remove`
                });
                return;
            }
            res.json({
                success: true,
                message: `${interaction_type.charAt(0).toUpperCase() + interaction_type.slice(1)} removed successfully`
            });
        }
        catch (error) {
            throw error;
        }
    }
    async getUserArticleInteractions(req, res) {
        const { userId, articleId } = req.params;
        try {
            const interactions = await Interaction_1.default.find({
                userId,
                articleId
            }).select('interactionType content createdAt');
            const interactionStatus = {
                liked: false,
                shared: false,
                viewed: false,
                comments: []
            };
            interactions.forEach(interaction => {
                switch (interaction.interactionType) {
                    case 'like':
                        interactionStatus.liked = true;
                        break;
                    case 'share':
                        interactionStatus.shared = true;
                        break;
                    case 'view':
                        interactionStatus.viewed = true;
                        break;
                    case 'comment':
                        interactionStatus.comments.push({
                            id: interaction._id,
                            content: interaction.content,
                            createdAt: interaction.createdAt
                        });
                        break;
                }
            });
            res.json({
                success: true,
                data: {
                    userId,
                    articleId,
                    interactions: interactionStatus
                }
            });
        }
        catch (error) {
            throw error;
        }
    }
    async getUserInteractions(req, res) {
        const { userId } = req.params;
        const { limit = 20, offset = 0, interaction_type } = req.query;
        try {
            const query = { userId };
            if (interaction_type) {
                query.interactionType = interaction_type;
            }
            const interactions = await Interaction_1.default.find(query)
                .populate('articleId', 'title author createdAt')
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(Number(offset));
            const total = await Interaction_1.default.countDocuments(query);
            res.json({
                success: true,
                data: interactions,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            });
        }
        catch (error) {
            throw error;
        }
    }
    async getArticleInteractions(req, res) {
        const { articleId } = req.params;
        const { limit = 20, offset = 0, interaction_type } = req.query;
        try {
            const query = { articleId };
            if (interaction_type) {
                query.interactionType = interaction_type;
            }
            const interactions = await Interaction_1.default.find(query)
                .populate('userId', 'username')
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(Number(offset));
            const total = await Interaction_1.default.countDocuments(query);
            res.json({
                success: true,
                data: interactions,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            });
        }
        catch (error) {
            throw error;
        }
    }
    async getArticleComments(req, res) {
        const { articleId } = req.params;
        const { limit = 10, offset = 0 } = req.query;
        try {
            const comments = await Interaction_1.default.find({
                articleId,
                interactionType: 'comment'
            })
                .populate('userId', 'username')
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(Number(offset));
            const total = await Interaction_1.default.countDocuments({
                articleId,
                interactionType: 'comment'
            });
            res.json({
                success: true,
                data: comments,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            });
        }
        catch (error) {
            throw error;
        }
    }
    async getArticleStats(req, res) {
        const { articleId } = req.params;
        try {
            const stats = await Interaction_1.default.aggregate([
                { $match: { articleId: articleId } },
                {
                    $group: {
                        _id: '$interactionType',
                        count: { $sum: 1 }
                    }
                }
            ]);
            const formattedStats = stats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {});
            const allTypes = ['view', 'like', 'share', 'comment'];
            allTypes.forEach(type => {
                if (!formattedStats[type]) {
                    formattedStats[type] = 0;
                }
            });
            const totalInteractions = stats.reduce((sum, stat) => sum + stat.count, 0);
            res.json({
                success: true,
                data: {
                    articleId,
                    interactions: formattedStats,
                    totalInteractions
                }
            });
        }
        catch (error) {
            throw error;
        }
    }
    async deleteInteraction(req, res) {
        const { id } = req.params;
        try {
            const interaction = await Interaction_1.default.findByIdAndDelete(id);
            if (!interaction) {
                res.status(404).json({
                    success: false,
                    message: 'Interaction not found'
                });
                return;
            }
            res.json({
                success: true,
                message: 'Interaction deleted successfully'
            });
        }
        catch (error) {
            throw error;
        }
    }
    async updateComment(req, res) {
        const { id } = req.params;
        const { content } = req.body;
        if (!content?.trim()) {
            res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
            return;
        }
        try {
            const interaction = await Interaction_1.default.findOneAndUpdate({ _id: id, interactionType: 'comment' }, { content: content.trim() }, { new: true, runValidators: true }).populate('userId', 'username');
            if (!interaction) {
                res.status(404).json({
                    success: false,
                    message: 'Comment not found'
                });
                return;
            }
            res.json({
                success: true,
                data: interaction,
                message: 'Comment updated successfully'
            });
        }
        catch (error) {
            throw error;
        }
    }
}
exports.InteractionController = InteractionController;
