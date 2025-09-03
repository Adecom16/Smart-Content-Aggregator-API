import natural from 'natural';
import axios from 'axios';

interface SummaryConfig {
  maxSentences?: number;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  maxLength?: number;
}

interface HuggingFaceResponse {
  summary_text: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

interface CohereResponse {
  summary: string;
}

export class ExtractiveSummarizer {
  private readonly tokenizer = new natural.WordTokenizer();
  private readonly stemmer = natural.PorterStemmer;
  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
    'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 
    'can', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'you', 'your', 'he', 
    'him', 'his', 'she', 'her', 'it', 'its', 'we', 'us', 'our', 'they', 'them', 'their'
  ]);

  generateSummary(content: string, config: SummaryConfig = {}): string {
    const { maxSentences = 3 } = config;
    
    const sentences = this.splitIntoSentences(content);
    
    if (sentences.length <= maxSentences) {
      return sentences.join(' ');
    }

    const sentenceScores = this.calculateSentenceScores(sentences);
    
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index)
      .map(item => item.sentence);

    return topSentences.join(' ');
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 15 && sentence.split(' ').length > 3);
  }

  private calculateSentenceScores(sentences: string[]): Array<{sentence: string, score: number, index: number}> {
    const documents = sentences.map(sentence => 
      this.tokenizer.tokenize(sentence.toLowerCase())
        ?.map(token => this.stemmer.stem(token))
        .filter(token => token && token.length > 2 && !this.stopWords.has(token)) || []
    );

    const tfidf = new natural.TfIdf();
    documents.forEach(doc => tfidf.addDocument(doc));

    return sentences.map((sentence, index) => {
      const terms = documents[index];
      let score = 0;
      
      terms.forEach(term => {
        const tfidfScore = tfidf.tfidf(term, index);
        score += tfidfScore;
      });
      
      const positionBonus = index === 0 ? 0.15 : (index === 1 ? 0.05 : 0);
      const lengthPenalty = terms.length > 30 ? 0.9 : 1.0;
      const normalizedScore = terms.length > 0 ? 
        (score / Math.sqrt(terms.length)) * lengthPenalty + positionBonus : 0;
      
      return { sentence, score: normalizedScore, index };
    });
  }
}

export class AISummaryService {
  private readonly openAIApiKey: string;
  private readonly huggingFaceApiKey: string;
  private readonly cohereApiKey: string;
  private readonly extractiveFallback = new ExtractiveSummarizer();

  private readonly providers = {
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      models: {
        'llama2': { description: 'Llama 2 7B - Good for summarization' },
        'llama2:13b': { description: 'Llama 2 13B - Better quality, slower' },
        'mistral': { description: 'Mistral 7B - Fast and efficient' },
        'codellama': { description: 'Code Llama - Good for technical content' },
        'phi': { description: 'Microsoft Phi - Small but capable' }
      }
    },
    
    cohere: {
      baseUrl: 'https://api.cohere.ai/v1/summarize',
      models: {
        'command': { description: 'Cohere Command - 5 API calls/min free' },
        'command-light': { description: 'Cohere Command Light - Faster, free tier' }
      }
    },
    
    huggingface: {
      models: {
        'sshleifer/distilbart-cnn-12-6': { maxLength: 1024, minLength: 30, description: 'DistilBART (Free)' },
        't5-small': { maxLength: 512, minLength: 20, description: 'T5 Small (Free)' },
        'facebook/bart-large-cnn': { maxLength: 1024, minLength: 30, description: 'BART (May require Pro)' }
      }
    },
    
    openai: {
      models: {
        'gpt-3.5-turbo': { maxTokens: 4096, description: 'ChatGPT 3.5 (Paid)' },
        'gpt-4o-mini': { maxTokens: 128000, description: 'GPT-4 Mini (Paid)' }
      }
    }
  };

  constructor() {
    this.openAIApiKey = process.env.OPENAI_API_KEY || '';
    this.huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY || '';
    this.cohereApiKey = process.env.COHERE_API_KEY || '';
  }

  async generateOllamaSummary(content: string, config: SummaryConfig = {}): Promise<string> {
    const { model = 'llama2', maxLength = 150 } = config;

    try {
      const prompt = `Please provide a concise summary of the following text in 2-3 sentences. Focus on the main points and key insights:

${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Summary:`;

      const response = await axios.post<OllamaResponse>(
        `${this.providers.ollama.baseUrl}/api/generate`,
        {
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: maxLength
          }
        },
        { 
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const summary = response.data.response?.trim();
      
      if (!summary || summary.length < 10) {
        throw new Error('Invalid response from Ollama');
      }

      return this.cleanSummary(summary);

    } catch (error) {
      throw new Error(`Ollama error: ${this.getErrorMessage(error)}`);
    }
  }

  async generateCohereSummary(content: string, config: SummaryConfig = {}): Promise<string> {
    const { model = 'command-light', maxLength = 150 } = config;

    if (!this.cohereApiKey) {
      throw new Error('Cohere API key not available');
    }

    try {
      const response = await axios.post<CohereResponse>(
        this.providers.cohere.baseUrl,
        {
          text: content.substring(0, 100000),
          length: maxLength < 100 ? 'short' : maxLength < 200 ? 'medium' : 'long',
          format: 'paragraph',
          model,
          extractiveness: 'low',
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.cohereApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const summary = response.data.summary?.trim();
      
      if (!summary || summary.length < 10) {
        throw new Error('Invalid response from Cohere');
      }

      return this.cleanSummary(summary);

    } catch (error) {
      throw new Error(`Cohere error: ${this.getErrorMessage(error)}`);
    }
  }

  async generateHuggingFaceSummary(content: string, config: SummaryConfig = {}): Promise<string> {
    const { model = 'sshleifer/distilbart-cnn-12-6' } = config;

    if (!this.huggingFaceApiKey) {
      throw new Error('HuggingFace API key not available');
    }

    const freeModels = ['sshleifer/distilbart-cnn-12-6', 't5-small'];
    const modelsToTry = freeModels.includes(model) ? [model, ...freeModels.filter(m => m !== model)] : freeModels;

    for (const currentModel of modelsToTry) {
      try {
        const truncatedContent = this.truncateContent(content, 1000);
        const modelConfig = this.providers.huggingface.models[currentModel as keyof typeof this.providers.huggingface.models];
        
        const response = await axios.post<HuggingFaceResponse[]>(
          `https://api-inference.huggingface.co/models/${currentModel}`,
          { 
            inputs: truncatedContent,
            parameters: {
              max_length: Math.min(modelConfig?.maxLength || 512, 200),
              min_length: Math.min(modelConfig?.minLength || 20, 30),
              do_sample: false,
              early_stopping: true
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.huggingFaceApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        const summary = response.data[0]?.summary_text?.trim();
        
        if (!summary || summary.length < 10) {
          throw new Error(`Invalid summary from ${currentModel}`);
        }

        return this.cleanSummary(summary);

      } catch (error) {
        if (currentModel === modelsToTry[modelsToTry.length - 1]) {
          throw new Error(`HuggingFace error: ${this.getErrorMessage(error)}`);
        }
      }
    }

    throw new Error('All HuggingFace models failed');
  }

  async generateOpenAISummary(content: string, config: SummaryConfig = {}): Promise<string> {
    const { maxTokens = 150, temperature = 0.3, model = 'gpt-3.5-turbo' } = config;

    if (!this.openAIApiKey) {
      throw new Error('OpenAI API key not available');
    }

    try {
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [{
            role: 'user',
            content: `Summarize the following text in 2-3 concise sentences:\n\n${content.substring(0, 3000)}`
          }],
          max_tokens: maxTokens,
          temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openAIApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const summary = response.data.choices[0]?.message?.content?.trim();
      
      if (!summary || summary.length < 10) {
        throw new Error('Invalid response from OpenAI');
      }

      return this.cleanSummary(summary);

    } catch (error) {
      throw new Error(`OpenAI error: ${this.getErrorMessage(error)}`);
    }
  }

  async generateBestSummary(content: string, config: SummaryConfig = {}): Promise<{
    summary: string;
    provider: string;
    model: string;
    method: 'ai' | 'extractive';
  }> {
    const providers = [
      { name: 'ollama', method: () => this.generateOllamaSummary(content, { ...config, model: 'llama2' }) },
      { name: 'cohere', method: () => this.generateCohereSummary(content, config) },
      { name: 'huggingface', method: () => this.generateHuggingFaceSummary(content, config) },
      { name: 'openai', method: () => this.generateOpenAISummary(content, config) }
    ];

    for (const { name, method } of providers) {
      try {
        const summary = await method();
        
        if (this.isValidSummary(summary, content)) {
          return {
            summary,
            provider: name,
            model: config.model || 'default',
            method: 'ai'
          };
        }
      } catch (error) {
        continue;
      }
    }

    const summary = this.extractiveFallback.generateSummary(content, config);
    
    return {
      summary,
      provider: 'extractive',
      model: 'tf-idf',
      method: 'extractive'
    };
  }

  private truncateContent(content: string, maxTokens: number): string {
    const estimatedChars = maxTokens * 3;
    return content.length > estimatedChars ? content.substring(0, estimatedChars) + '...' : content;
  }

  private isValidSummary(summary: string, originalContent: string): boolean {
    const cleanSummary = this.cleanSummary(summary);
    return !!(
      cleanSummary &&
      cleanSummary.length >= 20 &&
      cleanSummary.length < originalContent.length * 0.8 &&
      cleanSummary.split(' ').length >= 10 &&
      !cleanSummary.toLowerCase().includes('error') &&
      !cleanSummary.toLowerCase().includes('failed') &&
      !cleanSummary.includes('undefined')
    );
  }

  private cleanSummary(summary: string): string {
    return summary
      .replace(/^\[.*?\]\s*/, '')
      .replace(/^(summary|summary:)\s*/i, '')
      .replace(/\s+/g, ' ')
      .replace(/^["']|["']$/g, '')
      .trim();
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;
      return `HTTP ${status} - ${message}`;
    }
    return error instanceof Error ? error.message : String(error);
  }

  async testAllProviders(): Promise<{
    [key: string]: { available: boolean; error?: string; model?: string };
  }> {
    const testContent = "Artificial intelligence is transforming how we work and live. Machine learning algorithms can now perform complex tasks that once required human intelligence. This technology has applications in healthcare, finance, and many other industries.";
    
    const results: { [key: string]: { available: boolean; error?: string; model?: string } } = {};

    try {
      await this.generateOllamaSummary(testContent, { model: 'llama2' });
      results.ollama = { available: true, model: 'llama2' };
    } catch (error) {
      results.ollama = { available: false, error: this.getErrorMessage(error) };
    }

    if (this.cohereApiKey) {
      try {
        await this.generateCohereSummary(testContent);
        results.cohere = { available: true, model: 'command-light' };
      } catch (error) {
        results.cohere = { available: false, error: this.getErrorMessage(error) };
      }
    } else {
      results.cohere = { available: false, error: 'API key not provided' };
    }

    if (this.huggingFaceApiKey) {
      try {
        await this.generateHuggingFaceSummary(testContent);
        results.huggingface = { available: true, model: 'sshleifer/distilbart-cnn-12-6' };
      } catch (error) {
        results.huggingface = { available: false, error: this.getErrorMessage(error) };
      }
    } else {
      results.huggingface = { available: false, error: 'API key not provided' };
    }

    if (this.openAIApiKey) {
      try {
        await this.generateOpenAISummary(testContent);
        results.openai = { available: true, model: 'gpt-3.5-turbo' };
      } catch (error) {
        results.openai = { available: false, error: this.getErrorMessage(error) };
      }
    } else {
      results.openai = { available: false, error: 'API key not provided' };
    }

    results.extractive = { available: true, model: 'tf-idf' };

    return results;
  }
}

export class SummaryService {
  private readonly aiService = new AISummaryService();
  private readonly extractive = new ExtractiveSummarizer();

  async generateSummaryForArticle(content: string, existingSummary?: string): Promise<{
    summary: string;
    generated: boolean;
    provider: string;
    model: string;
    method: 'ai' | 'extractive';
  }> {
    if (existingSummary && existingSummary.trim()) {
      return {
        summary: existingSummary.trim(),
        generated: false,
        provider: 'user-provided',
        model: 'none',
        method: 'extractive'
      };
    }

    const result = await this.aiService.generateBestSummary(content, { maxSentences: 3 });
    
    return {
      summary: result.summary,
      generated: true,
      provider: result.provider,
      model: result.model,
      method: result.method
    };
  }

  async getProvidersStatus(): Promise<{
    [key: string]: { available: boolean; error?: string; model?: string };
  }> {
    return await this.aiService.testAllProviders();
  }

  async summarize(content: string, maxSentences: number = 3): Promise<string> {
    const result = await this.aiService.generateBestSummary(content, { maxSentences });
    return result.summary;
  }
}

export default SummaryService;