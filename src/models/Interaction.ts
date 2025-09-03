import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IInteraction extends Document {
  userId: Types.ObjectId;
  articleId: Types.ObjectId;
  interactionType: 'view' | 'like' | 'share' | 'comment';
  content?: string;
  shareMetadata?: {
    platform: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy_link' | 'whatsapp';
    message?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  
  // Instance methods
  isRecent(hours?: number): boolean;
  toSafeObject(): any;
}

// Define interface for static methods
interface IInteractionModel extends Model<IInteraction> {
  getArticleStats(articleId: string): Promise<any>;
  getUserArticleInteractions(userId: string, articleId: string): Promise<IInteraction[]>;
  getTrendingArticles(hours?: number, limit?: number): Promise<any>;
}

// Define interface for instance methods
interface IInteractionMethods {
  isRecent(hours?: number): boolean;
  toSafeObject(): any;
}

type InteractionModel = Model<IInteraction, {}, IInteractionMethods> & IInteractionModel;

const InteractionSchema = new Schema<IInteraction, InteractionModel, IInteractionMethods>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  articleId: {
    type: Schema.Types.ObjectId,
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
    required: function(this: IInteraction): boolean {
      return this.interactionType === 'comment';
    },
    maxlength: 1000,
    trim: true,
    validate: {
      validator: function(this: IInteraction, value: string): boolean {
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
      required: function(this: IInteraction): boolean {
        return this.interactionType === 'share';
      },
      validate: {
        validator: function(this: IInteraction, value: string): boolean {
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
    transform: function(doc, ret) {
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
InteractionSchema.index(
  { userId: 1, articleId: 1, interactionType: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { 
      interactionType: { $ne: 'comment' }
    }
  }
);

// Virtual for interaction age
InteractionSchema.virtual('ageInDays').get(function(this: IInteraction): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
InteractionSchema.pre('save', function(this: IInteraction, next) {
  if (this.interactionType !== 'share') {
    this.shareMetadata = undefined;
  }
  
  if (this.interactionType !== 'comment') {
    this.content = undefined;
  }
  next();
});

// Static methods
InteractionSchema.statics.getArticleStats = async function(articleId: string): Promise<any> {
  return this.aggregate([
    { $match: { articleId: new mongoose.Types.ObjectId(articleId) } },
    { 
      $group: { 
        _id: '$interactionType',
        count: { $sum: 1 }
      }
    }
  ]);
};

InteractionSchema.statics.getUserArticleInteractions = async function(
  userId: string, 
  articleId: string
): Promise<IInteraction[]> {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    articleId: new mongoose.Types.ObjectId(articleId)
  }).select('interactionType content createdAt');
};

InteractionSchema.statics.getTrendingArticles = async function(
  hours: number = 24, 
  limit: number = 10
): Promise<any> {
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
InteractionSchema.methods.isRecent = function(hours: number = 24): boolean {
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.createdAt > hoursAgo;
};

InteractionSchema.methods.toSafeObject = function(): any {
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
InteractionSchema.post('save', function(error: any, doc: IInteraction, next: (err?: any) => void) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error(`User has already ${doc.interactionType}d this article`));
  } else {
    next(error);
  }
});

export default mongoose.model<IInteraction, InteractionModel>('Interaction', InteractionSchema);