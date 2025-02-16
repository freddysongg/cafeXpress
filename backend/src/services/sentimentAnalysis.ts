import { PREDEFINED_KEYWORDS } from '@config/keywords.js';
import { getEmbedding } from '@services/gemini.js';
import { cosineSimilarity } from '@utils/math.js';
import { getCache, setCache } from '@services/cache.js';

const CACHE_PREFIX = 'sentiment:keywords:';

export class SentimentAnalysisService {
  private sentimentKeywordEmbeddings: Map<string, number[]> = new Map();
  private threshold: number;
  private initialized: boolean = false;

  constructor(threshold = 0.75) {
    this.threshold = threshold;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.getSentimentKeywordEmbeddings();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SentimentAnalysisService:', error);
      throw new Error('Failed to initialize sentiment analysis service');
    }
  }

  private async getSentimentKeywordEmbeddings() {
    const keywords = [
      ...new Set([
        ...PREDEFINED_KEYWORDS.ambiance,
        ...PREDEFINED_KEYWORDS.dietary,
        ...PREDEFINED_KEYWORDS.features,
        ...PREDEFINED_KEYWORDS.coffee
      ])
    ];

    for (const keyword of keywords) {
      const cacheKey = `${CACHE_PREFIX}${keyword}`;
      let embedding = await getCache<number[]>(cacheKey);

      if (!embedding) {
        embedding = await getEmbedding(keyword);
        await setCache(cacheKey, embedding, 60 * 60 * 24 * 7); // Cache for 7 days
      }

      if (embedding) {
        this.sentimentKeywordEmbeddings.set(keyword, embedding);
      }
    }
  }

  async analyzeSentiment(input: string) {
    if (!this.initialized) {
      throw new Error('SentimentAnalysisService not initialized');
    }

    const inputEmbedding = await getEmbedding(input);
    const sentimentMatches: { keyword: string; similarity: number }[] = [];

    for (const [keyword, embedding] of this.sentimentKeywordEmbeddings.entries()) {
      const similarity = cosineSimilarity(inputEmbedding, embedding);
      if (similarity >= this.threshold) {
        sentimentMatches.push({ keyword, similarity });
      }
    }

    sentimentMatches.sort((a, b) => b.similarity - a.similarity);

    return {
      input,
      sentimentMatches,
      matchedSentimentKeywords: sentimentMatches.map((m) => m.keyword),
      overallSentiment: this.calculateOverallSentiment(sentimentMatches)
    };
  }

  private calculateOverallSentiment(matches: { keyword: string; similarity: number }[]) {
    if (matches.length === 0) return 0;
    
    const weightedSum = matches.reduce((sum, match) => sum + match.similarity, 0);
    return weightedSum / matches.length;
  }

  async findMatchingCafes(input: string, cafes: any[]) {
    if (!this.initialized) {
      throw new Error('SentimentAnalysisService not initialized');
    }

    const analysis = await this.analyzeSentiment(input);

    return cafes
      .map((cafe) => {
        const cafeKeywords = cafe.keywords || [];
        const matchedKeywords = analysis.matchedSentimentKeywords.filter((k) =>
          cafeKeywords.includes(k)
        );
        
        const matchScore = matchedKeywords.length / Math.max(1, analysis.matchedSentimentKeywords.length);
        
        return {
          ...cafe,
          matchedKeywords,
          matchScore,
          relevanceScore: this.calculateRelevanceScore(matchScore, cafe.rating || 0)
        };
      })
      .filter((cafe) => cafe.matchScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateRelevanceScore(matchScore: number, rating: number): number {
    const weightedMatchScore = matchScore * 0.7; 
    const weightedRating = (rating / 5) * 0.3; 
    return weightedMatchScore + weightedRating;
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService();
