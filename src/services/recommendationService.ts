import mongoose from 'mongoose';
import Article, { IArticle } from '../models/Article';
import User, { IUser } from '../models/User';
import Interaction, { IInteraction } from '../models/Interaction';

export interface RecommendationScore {
  article: IArticle;
  score: number;
  reasons: string[];
}

export class RecommendationService {
  async getRecommendations(userId: string, limit: number = 10): Promise<RecommendationScore[]> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const userInteractions = await Interaction.find({ userId }).select('articleId');
    const interactedArticleIds = userInteractions.map(interaction => interaction.articleId);

    const candidateArticles = await Article.find({
      _id: { $nin: interactedArticleIds }
    }).limit(limit * 2);

    if (candidateArticles.length === 0) {
      return [];
    }

    const recommendations = await Promise.all(
      candidateArticles.map(async (article) => {
        const score = await this.calculateRecommendationScore(user, article);
        return score;
      })
    );

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async calculateRecommendationScore(user: IUser, article: IArticle): Promise<RecommendationScore> {
    let score = 0;
    const reasons: string[] = [];

    const interestScore = this.calculateInterestScore(user.interests, article.tags || []);
    score += interestScore * 0.4;
    if (interestScore > 0) {
      reasons.push(`Matches your interests: ${this.getMatchingInterests(user.interests, article.tags || []).join(', ')}`);
    }

    const popularityScore = await this.calculatePopularityScore(article._id as mongoose.Types.ObjectId);
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

  private calculateInterestScore(userInterests: string[], articleTags: string[]): number {
    if (userInterests.length === 0 || articleTags.length === 0) {
      return 0;
    }

    const matchingTags = userInterests.filter(interest => 
      articleTags.some(tag => tag.includes(interest) || interest.includes(tag))
    );

    return matchingTags.length / userInterests.length;
  }

  private getMatchingInterests(userInterests: string[], articleTags: string[]): string[] {
    return userInterests.filter(interest => 
      articleTags.some(tag => tag.includes(interest) || interest.includes(tag))
    );
  }

  private async calculatePopularityScore(articleId: mongoose.Types.ObjectId): Promise<number> {
    const interactionCounts = await Interaction.aggregate([
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
      totalScore += count * (weights[type as keyof typeof weights] || 1);
    });

    return Math.min(totalScore / 100, 1);
  }

  private calculateFreshnessScore(createdAt: Date): number {
    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays <= 1) return 1.0;
    if (ageInDays <= 7) return 0.9;
    if (ageInDays <= 30) return 0.7;
    if (ageInDays <= 90) return 0.4;
    return 0.2;
  }

  private async calculateAuthorScore(author: string): Promise<number> {
    const authorArticles = await Article.find({ author }).limit(10);
    
    if (authorArticles.length === 0) {
      return 0.5;
    }

    const scores = await Promise.all(
      authorArticles.map(article => this.calculatePopularityScore(article._id as mongoose.Types.ObjectId))
    );

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return averageScore;
  }

  async getTrendingArticles(limit: number = 10): Promise<IArticle[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const trending = await Interaction.aggregate([
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
    return await Article.find({ _id: { $in: articleIds } });
  }
}