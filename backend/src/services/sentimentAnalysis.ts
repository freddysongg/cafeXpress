import { PREDEFINED_KEYWORDS } from '@config/keywords.js';
import { getEmbedding } from '@services/gemini.js';
import { cosineSimilarity } from '@utils/math.js';
import { getCache, setCache } from '@services/cache.js';

const CACHE_PREFIX = 'sentiment:keywords:';

export class SentimentAnalysisService {
  private sentimentKeywordEmbeddings: Map<string, number[]> = new Map();
  private threshold: number;

  constructor(threshold = 0.75) {
    this.threshold = threshold;
  }

  async initialize() {
    await this.getSentimentKeywordEmbeddings();
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
        await setCache(cacheKey, embedding, 60 * 60 * 24 * 7);
      }

      if (embedding) {
        this.sentimentKeywordEmbeddings.set(keyword, embedding);
      }
    }
  }

  async analyzeSentiment(input: string) {
    const inputEmbedding = await getEmbedding(input);
    const sentimentMatches: { keyword: string; similarity: number }[] = [];

    for (const [keyword, embedding] of this.sentimentKeywordEmbeddings.entries()) {
      const similarity = cosineSimilarity(inputEmbedding, embedding);
      if (similarity >= this.threshold) {
        sentimentMatches.push({ keyword, similarity });
      }
    }

    return {
      input,
      sentimentMatches,
      matchedSentimentKeywords: sentimentMatches.map((m) => m.keyword)
    };
  }

  async findMatchingCafes(input: string, cafes: any[]) {
    const analysis = await this.analyzeSentiment(input);

    return cafes
      .map((cafe) => {
        const cafeKeywords = cafe.keywords || [];
        const matchedCount = analysis.matchedSentimentKeywords.filter((k) =>
          cafeKeywords.includes(k)
        ).length;

        return {
          ...cafe,
          matchedKeywords: analysis.matchedSentimentKeywords.filter((k) =>
            cafeKeywords.includes(k)
          ),
          matchScore: matchedCount / analysis.matchedSentimentKeywords.length
        };
      })
      .filter((cafe) => cafe.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService();
