import { Request, Response } from 'express';
import Article from '../models/Article';
import { SummaryService } from '../services/summaryService';

const summaryService = new SummaryService();

interface CreateArticleRequest {
  title: string;
  content: string;
  author: string;
  summary?: string;
  tags?: string[];
}

interface UpdateArticleRequest {
  title?: string;
  content?: string;
  author?: string;
  summary?: string;
  tags?: string[];
}

interface PaginationQuery {
  limit?: string;
  offset?: string;
  page?: string;
  search?: string;
  tags?: string;
  author?: string;
}

export class ArticleController {
  async createArticle(req: Request<{}, {}, CreateArticleRequest>, res: Response): Promise<void> {
    try {
      const { title, content, author, summary, tags } = req.body;

      if (!title || !content || !author) {
        res.status(400).json({
          success: false,
          message: 'Title, content, and author are required fields'
        });
        return;
      }

      if (content.trim().length < 50) {
        res.status(400).json({
          success: false,
          message: 'Content must be at least 50 characters long'
        });
        return;
      }

      let finalSummary = summary;
      let summaryMetadata = null;

      if (!summary || summary.trim() === '') {
        try {
          const summaryResult = await summaryService.generateSummaryForArticle(content);
          finalSummary = summaryResult.summary;
          summaryMetadata = {
            generated: summaryResult.generated,
            provider: summaryResult.provider,
            model: summaryResult.model,
            method: summaryResult.method
          };
        } catch (error) {
          finalSummary = content.substring(0, 200) + '...';
        }
      }

      const article = new Article({
        title: title.trim(),
        content: content.trim(),
        author: author.trim(),
        summary: finalSummary,
        tags: tags?.map(tag => tag.trim().toLowerCase()) || []
      });

      const savedArticle = await article.save();
      
      res.status(201).json({
        success: true,
        data: savedArticle,
        metadata: summaryMetadata,
        message: 'Article created successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create article',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async getArticles(req: Request<{}, {}, {}, PaginationQuery>, res: Response): Promise<void> {
    try {
      const { 
        limit = '10', 
        offset = '0', 
        page, 
        search, 
        tags, 
        author 
      } = req.query;

      const filters: any = {};
      
      if (search) {
        filters.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } }
        ];
      }

      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
        filters.tags = { $in: tagArray };
      }

      if (author) {
        filters.author = { $regex: author, $options: 'i' };
      }

      const limitNum = Math.min(Number(limit), 100);
      const pageNum = page ? Number(page) : 1;
      const offsetNum = page ? (pageNum - 1) * limitNum : Number(offset);
      
      const [articles, total] = await Promise.all([
        Article.find(filters)
          .sort({ createdAt: -1 })
          .limit(limitNum)
          .skip(offsetNum)
          .select('-__v'), 
        Article.countDocuments(filters)
      ]);

      const totalPages = Math.ceil(total / limitNum);
      
      res.json({
        success: true,
        data: articles,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          page: pageNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters: { search, tags, author }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve articles',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async getArticleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid article ID format'
        });
        return;
      }
      
      const article = await Article.findById(id).select('-__v');
      
      if (!article) {
        res.status(404).json({
          success: false,
          message: 'Article not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: article
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve article',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async updateArticle(req: Request<{ id: string }, {}, UpdateArticleRequest>, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid article ID format'
        });
        return;
      }

      const cleanUpdates: any = {};
      if (updates.title) cleanUpdates.title = updates.title.trim();
      if (updates.content) cleanUpdates.content = updates.content.trim();
      if (updates.author) cleanUpdates.author = updates.author.trim();
      if (updates.summary) cleanUpdates.summary = updates.summary.trim();
      if (updates.tags) cleanUpdates.tags = updates.tags.map(tag => tag.trim().toLowerCase());

      if (cleanUpdates.content && cleanUpdates.content.length < 50) {
        res.status(400).json({
          success: false,
          message: 'Content must be at least 50 characters long'
        });
        return;
      }

      let summaryMetadata = null;
      if (cleanUpdates.content && !cleanUpdates.summary) {
        try {
          const summaryResult = await summaryService.generateSummaryForArticle(cleanUpdates.content);
          cleanUpdates.summary = summaryResult.summary;
          summaryMetadata = {
            generated: summaryResult.generated,
            provider: summaryResult.provider,
            model: summaryResult.model,
            method: summaryResult.method
          };
        } catch (error) {
          cleanUpdates.summary = cleanUpdates.content.substring(0, 200) + '...';
        }
      }

      const article = await Article.findByIdAndUpdate(
        id,
        { ...cleanUpdates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-__v');
      
      if (!article) {
        res.status(404).json({
          success: false,
          message: 'Article not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: article,
        metadata: summaryMetadata,
        message: 'Article updated successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update article',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async deleteArticle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid article ID format'
        });
        return;
      }
      
      const article = await Article.findByIdAndDelete(id);
      
      if (!article) {
        res.status(404).json({
          success: false,
          message: 'Article not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: { deletedId: id, title: article.title },
        message: 'Article deleted successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete article',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async regenerateSummary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { maxSentences = 3 } = req.body;

      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid article ID format'
        });
        return;
      }

      const article = await Article.findById(id);
      
      if (!article) {
        res.status(404).json({
          success: false,
          message: 'Article not found'
        });
        return;
      }

      try {
        const newSummary = await summaryService.summarize(article.content, maxSentences);

        article.summary = newSummary;
        article.updatedAt = new Date();
        await article.save();
        
        res.json({
          success: true,
          data: article,
          message: 'Summary regenerated successfully'
        });
      } catch (summaryError) {
        res.status(500).json({
          success: false,
          message: 'Failed to generate new summary',
          error: process.env.NODE_ENV === 'development' ? summaryError : undefined
        });
      }

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to regenerate summary',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async getProviderStatus(req: Request, res: Response): Promise<void> {
    try {
      const providersStatus = await summaryService.getProvidersStatus();
      
      res.json({
        success: true,
        data: providersStatus,
        message: 'Provider status retrieved successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get provider status',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async getArticlesByTags(req: Request, res: Response): Promise<void> {
    try {
      const { tags } = req.params;
      const { limit = '10', offset = '0' } = req.query;

      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      
      const articles = await Article.find({
        tags: { $in: tagArray }
      })
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset))
        .select('-__v');

      const total = await Article.countDocuments({
        tags: { $in: tagArray }
      });
      
      res.json({
        success: true,
        data: articles,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          totalPages: Math.ceil(total / Number(limit))
        },
        filters: { tags: tagArray }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve articles by tags',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async bulkRegenerateSummaries(req: Request, res: Response): Promise<void> {
    try {
      const { batchSize = 5, maxSentences = 3 } = req.body;

      const articlesNeedingSummaries = await Article.find({
        $or: [
          { summary: { $exists: false } },
          { summary: '' },
          { summary: { $regex: /^.{0,20}$/ } }
        ]
      }).limit(Number(batchSize));

      if (articlesNeedingSummaries.length === 0) {
        res.json({
          success: true,
          data: { updated: 0 },
          message: 'No articles need summary updates'
        });
        return;
      }

      const updatePromises = articlesNeedingSummaries.map(async (article) => {
        try {
          const summaryResult = await summaryService.generateSummaryForArticle(article.content);
          article.summary = summaryResult.summary;
          article.updatedAt = new Date();
          await article.save();
          return { 
            success: true, 
            id: article._id, 
            metadata: {
              provider: summaryResult.provider,
              model: summaryResult.model,
              method: summaryResult.method
            }
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { success: false, id: article._id, error: errorMessage };
        }
      });

      const results = await Promise.all(updatePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        success: true,
        data: {
          updated: successful.length,
          failed: failed.length,
          results: results
        },
        message: `Bulk update completed: ${successful.length} successful, ${failed.length} failed`
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk summary regeneration',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async getArticleStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalArticles,
        totalAuthors,
        averageContentLength,
        tagStats,
        recentArticles,
        articlesWithSummaries
      ] = await Promise.all([
        Article.countDocuments(),
        Article.distinct('author').then(authors => authors.length),
        Article.aggregate([
          { $group: { _id: null, avgLength: { $avg: { $strLenCP: '$content' } } } }
        ]),
        Article.aggregate([
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        Article.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        Article.countDocuments({
          summary: { $exists: true, $ne: '', $not: /^.{0,20}$/ }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalArticles,
          totalAuthors,
          averageContentLength: Math.round(averageContentLength[0]?.avgLength || 0),
          topTags: tagStats,
          recentArticles: recentArticles,
          lastWeekGrowth: recentArticles,
          articlesWithSummaries,
          summaryCompletionRate: totalArticles > 0 ? Math.round((articlesWithSummaries / totalArticles) * 100) : 0
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve article statistics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
}