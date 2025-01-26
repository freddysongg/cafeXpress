import { PREDEFINED_KEYWORDS } from '@config/keywords.js';
import { getEmbedding } from '@services/gemini.js';
import { cosineSimilarity } from '@utils/math.js';
import { getCache, setCache } from '@services/cache.js';

const CACHE_PREFIX = 'semantic:keywords:';

export class SemanticAnalysisService {
  private keywordEmbeddings: Map<string, number[]> = new Map();

  async initialize() {
    await this.getKeywordEmbeddings();
  }

  private async getKeywordEmbeddings() {
    // Get all unique keywords
    const keywords = [
      ...new Set([
        ...PREDEFINED_KEYWORDS.ambiance,
        ...PREDEFINED_KEYWORDS.dietary,
        ...PREDEFINED_KEYWORDS.features,
        ...PREDEFINED_KEYWORDS.coffee
      ])
    ];

    // Load or generate embeddings
    for (const keyword of keywords) {
      const cacheKey = `${CACHE_PREFIX}${keyword}`;
      let embedding = await getCache<number[]>(cacheKey);

      if (!embedding) {
        embedding = await getEmbedding(keyword);
        await setCache(cacheKey, embedding, 60 * 60 * 24 * 7); // Cache for 1 week
      }

      if (embedding) {
        this.keywordEmbeddings.set(keyword, embedding);
      } else {
        console.warn(`Failed to get embedding for keyword: ${keyword}`);
      }
    }
  }

  async analyzeInput(input: string, threshold = 0.75) {
    const inputEmbedding = await getEmbedding(input);

    // Compare against all keyword embeddings
    const matches: { keyword: string; similarity: number }[] = [];

    for (const [keyword, embedding] of this.keywordEmbeddings.entries()) {
      const similarity = cosineSimilarity(inputEmbedding, embedding);
      if (similarity >= threshold) {
        matches.push({ keyword, similarity });
      }
    }

    // Sort by highest similarity
    matches.sort((a, b) => b.similarity - a.similarity);

    return {
      input,
      matches,
      matchedKeywords: matches.map((m) => m.keyword)
    };
  }

  async findMatchingCafes(input: string, cafes: any[], threshold = 0.75) {
    const analysis = await this.analyzeInput(input, threshold);

    return cafes
      .map((cafe) => {
        const cafeKeywords = cafe.keywords || [];
        const matchedCount = analysis.matchedKeywords.filter((k) =>
          cafeKeywords.includes(k)
        ).length;

        return {
          ...cafe,
          matchedKeywords: analysis.matchedKeywords.filter((k) => cafeKeywords.includes(k)),
          matchScore: matchedCount / analysis.matchedKeywords.length
        };
      })
      .filter((cafe) => cafe.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const semanticAnalysisService = new SemanticAnalysisService();
