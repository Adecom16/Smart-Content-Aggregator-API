"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const InteractionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    articleId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Article',
        required: true,
        index: true
    },
    interactionType: {
        type: String,
        required: true,
        enum: ['view', 'like', 'share', 'comment'],
        default: 'view',
        index: true
    },
    content: {
        type: String,
        required: function () {
            return this.interactionType === 'comment';
        },
        maxlength: 1000,
        trim: true,
        validate: {
            validator: function (value) {
                if (this.interactionType === 'comment') {
                    return !!value && value.trim().length > 0;
                }
                return true;
            },
            message: 'Comment content is required for comment interactions'
        }
    },
    shareMetadata: {
        platform: {
            type: String,
            enum: ['twitter', 'facebook', 'linkedin', 'email', 'copy_link', 'whatsapp'],
            required: function () {
                return this.interactionType === 'share';
            },
            validate: {
                validator: function (value) {
                    if (this.interactionType === 'share') {
                        return !!value;
                    }
                    return true;
                },
                message: 'Platform is required for share interactions'
            }
        },
        message: {
            type: String,
            maxlength: 500,
            trim: true
        }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            const { __v, ...result } = ret;
            return result;
        }
    }
});
// Compound indexes
InteractionSchema.index({ userId: 1, articleId: 1 });
InteractionSchema.index({ articleId: 1, interactionType: 1 });
InteractionSchema.index({ userId: 1, interactionType: 1 });
InteractionSchema.index({ createdAt: -1 });
// Conditional unique index
InteractionSchema.index({ userId: 1, articleId: 1, interactionType: 1 }, {
    unique: true,
    partialFilterExpression: {
        interactionType: { $ne: 'comment' }
    }
});
// Virtual for interaction age
InteractionSchema.virtual('ageInDays').get(function () {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
// Pre-save middleware
InteractionSchema.pre('save', function (next) {
    if (this.interactionType !== 'share') {
        this.shareMetadata = undefined;
    }
    if (this.interactionType !== 'comment') {
        this.content = undefined;
    }
    next();
});
// Static methods
InteractionSchema.statics.getArticleStats = async function (articleId) {
    return this.aggregate([
        { $match: { articleId: new mongoose_1.default.Types.ObjectId(articleId) } },
        {
            $group: {
                _id: '$interactionType',
                count: { $sum: 1 }
            }
        }
    ]);
};
InteractionSchema.statics.getUserArticleInteractions = async function (userId, articleId) {
    return this.find({
        userId: new mongoose_1.default.Types.ObjectId(userId),
        articleId: new mongoose_1.default.Types.ObjectId(articleId)
    }).select('interactionType content createdAt');
};
InteractionSchema.statics.getTrendingArticles = async function (hours = 24, limit = 10) {
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.aggregate([
        { $match: { createdAt: { $gte: timeAgo } } },
        {
            $group: {
                _id: '$articleId',
                totalInteractions: { $sum: 1 },
                likes: {
                    $sum: { $cond: [{ $eq: ['$interactionType', 'like'] }, 1, 0] }
                },
                shares: {
                    $sum: { $cond: [{ $eq: ['$interactionType', 'share'] }, 1, 0] }
                },
                comments: {
                    $sum: { $cond: [{ $eq: ['$interactionType', 'comment'] }, 1, 0] }
                },
                views: {
                    $sum: { $cond: [{ $eq: ['$interactionType', 'view'] }, 1, 0] }
                }
            }
        },
        {
            $addFields: {
                engagementScore: {
                    $add: [
                        '$views',
                        { $multiply: ['$likes', 3] },
                        { $multiply: ['$shares', 5] },
                        { $multiply: ['$comments', 4] }
                    ]
                }
            }
        },
        { $sort: { engagementScore: -1, totalInteractions: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'articles',
                localField: '_id',
                foreignField: '_id',
                as: 'article'
            }
        },
        { $unwind: '$article' },
        {
            $project: {
                article: 1,
                stats: {
                    totalInteractions: '$totalInteractions',
                    likes: '$likes',
                    shares: '$shares',
                    comments: '$comments',
                    views: '$views',
                    engagementScore: '$engagementScore'
                }
            }
        }
    ]);
};
// Instance methods
InteractionSchema.methods.isRecent = function (hours = 24) {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.createdAt > hoursAgo;
};
InteractionSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    return {
        id: obj._id,
        userId: obj.userId,
        articleId: obj.articleId,
        interactionType: obj.interactionType,
        content: obj.content,
        shareMetadata: obj.shareMetadata,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt
    };
};
// Error handling middleware
InteractionSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        next(new Error(`User has already ${doc.interactionType}d this article`));
    }
    else {
        next(error);
    }
});
exports.default = mongoose_1.default.model('Interaction', InteractionSchema);
