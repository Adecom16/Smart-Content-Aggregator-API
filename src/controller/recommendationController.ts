import { Request, Response } from 'express';
import { RecommendationService } from '../services/recommendationService';
import User from '../models/User';
import Interaction from '../models/Interaction';
import { IArticle } from '../models/Article';

const recommendationService = new RecommendationService();

export class RecommendationController {
  async getRecommendations(req: Request, res: Response): Promise<void> {
    const { user_id } = req.params;
    const { limit = 10 } = req.query;

    try {
      const startTime = Date.now();
      
      const recommendations = await recommendationService.getRecommendations(
        user_id, 
        Number(limit)
      );
      
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
    } catch (error: any) {
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

  async getTrendingArticles(req: Request, res: Response): Promise<void> {
    const { limit = 10 } = req.query;

    try {
      const startTime = Date.now();
      
      const trendingArticles = await recommendationService.getTrendingArticles(
        Number(limit)
      );
      
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
    } catch (error: any) {
      throw error;
    }
  }

  async getPopularArticles(req: Request, res: Response): Promise<void> {
    const { limit = 10 } = req.query;

    try {
      const startTime = Date.now();
      
      const popularArticles = await recommendationService.getTrendingArticles(
        Number(limit)
      );
      
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
    } catch (error: any) {
      throw error;
    }
  }

  async getRecommendationInsights(req: Request, res: Response): Promise<void> {
    const { user_id } = req.params;

    try {
      const user = await User.findById(user_id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      const userInteractions = await Interaction.find({ userId: user_id })
        .populate<{ articleId: IArticle }>('articleId', 'title tags author')
        .populate('articleId', 'title tags author')
        .limit(50)
        .sort({ createdAt: -1 });

      const interactionsByType = userInteractions.reduce((acc, interaction) => {
        acc[interaction.interactionType] = (acc[interaction.interactionType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const tagPreferences = userInteractions
        .filter(interaction => interaction.articleId?.tags)
        .flatMap(interaction => interaction.articleId.tags)
        .filter((tag): tag is string => typeof tag === 'string')
        .reduce((acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

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
            .sort(([,a], [,b]) => (b as number) - (a as number))
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
    } catch (error: any) {
      throw error;
    }
  }

  private getMostActiveDay(interactions: any[]): string {
    const dayCount = interactions.reduce((acc, interaction) => {
      const day = interaction.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostActiveDay = Object.entries(dayCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    return mostActiveDay ? mostActiveDay[0] : 'No activity';
  }

  private getTopAuthors(interactions: any[]): Array<{author: string, interactions: number}> {
    const authorCount = interactions
      .filter(interaction => interaction.articleId?.author)
      .reduce((acc, interaction) => {
        const author = interaction.articleId.author;
        acc[author] = (acc[author] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(authorCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([author, count]) => ({ author, interactions: count as number }));
  }
}