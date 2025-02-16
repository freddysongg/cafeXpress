import { PREDEFINED_KEYWORDS } from '@config/keywords.js';
import { getEmbedding } from '@services/gemini.js';
import { getCache, setCache } from '@services/cache.js';
import type { SearchResult, SentimentScore, SentimentResult } from '@schemas/semantic.js';
import type { GeminiClient } from '@schemas/gemini.js';
import { eq, sql } from 'drizzle-orm';
import { db } from '@config/db.js';
import { cafes, reviews } from '@config/schemas.js';

const CACHE_PREFIX = 'sentiment:keywords:';

interface Entity {
  name: string;
  type: string;
  salience: number;
  sentimentScore: number;
}

interface DbCafe {
  id: string;
  name: string;
  description: string | null;
  dietaryOptions: unknown;
  ambiance: unknown;
  keywords: string[] | null;
  avgRating: number;
  sentimentScore: SentimentScore;
}

interface Preferences {
  dietary?: string[];
  activities?: string[];
  ambiance?: string[];
}

export class SentimentAnalysisService {
  private initialized: boolean = false;
  private keywordEmbeddings: Map<string, number[]> = new Map();
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadKeywordEmbeddings();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SentimentAnalysisService:', error);
      throw new Error('Failed to initialize sentiment analysis service');
    }
  }

  private async loadKeywordEmbeddings(): Promise<void> {
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
        this.keywordEmbeddings.set(keyword, embedding);
      }
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    if (!this.initialized) {
      throw new Error('SentimentAnalysisService not initialized');
    }

    const response = await this.geminiClient.analyzeSentiment(text);
    const entities = await this.extractEntities(text, response.score);
    const sentimentScore = this.calculateSentimentScore(response.score, entities);

    return {
      score: sentimentScore,
      matchedSentimentKeywords: entities.map((e) => e.name)
    };
  }

  private calculateSentimentScore(baseScore: number, entities: Entity[]): SentimentScore {
    // Adjust the base sentiment score based on entity sentiments
    const entitySentiments = entities.map((e) => e.sentimentScore);
    const avgEntitySentiment =
      entitySentiments.length > 0
        ? entitySentiments.reduce((a, b) => a + b, 0) / entitySentiments.length
        : baseScore;

    // Combine base score with entity sentiments
    const finalScore = (baseScore + avgEntitySentiment) / 2;

    return {
      positive: finalScore,
      negative: 1 - finalScore,
      neutral: 0,
      compound: finalScore * 2 - 1
    };
  }

  private async extractEntities(text: string, baseScore: number): Promise<Entity[]> {
    const words = text.split(/\s+/);

    return words.map((word) => ({
      name: word,
      type: 'keyword',
      salience: 1.0,
      sentimentScore: baseScore
    }));
  }

  private determineSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score >= 0.05) return 'positive';
    if (score <= -0.05) return 'negative';
    return 'neutral';
  }

  async findMatchingCafes(preferences: Preferences): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new Error('SentimentAnalysisService not initialized');
    }

    const results = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        description: cafes.description,
        dietaryOptions: cafes.dietaryOptions,
        ambiance: cafes.ambiance,
        keywords: cafes.keywords,
        avgRating: sql<number>`avg((${reviews.rating})::numeric)`,
        sentimentScore: sql<SentimentScore>`jsonb_build_object(
          'positive', avg((${reviews.sentimentScore}->>'positive')::numeric),
          'negative', avg((${reviews.sentimentScore}->>'negative')::numeric),
          'neutral', avg((${reviews.sentimentScore}->>'neutral')::numeric),
          'compound', avg((${reviews.sentimentScore}->>'compound')::numeric)
        )`
      })
      .from(cafes)
      .leftJoin(reviews, eq(reviews.cafeId, cafes.id))
      .groupBy(cafes.id);

    return results
      .map((cafe) => {
        const matchScore = this.calculateMatchScore(cafe, preferences);
        const sentimentBoost =
          cafe.sentimentScore.compound > 0 ? cafe.sentimentScore.compound * 0.2 : 0;
        const finalScore = matchScore + sentimentBoost;

        return {
          id: cafe.id,
          cafeId: cafe.id,
          name: cafe.name,
          description: cafe.description || '',
          score: finalScore,
          confidenceScore: finalScore,
          reason: this.generateMatchReason(cafe, preferences),
          metadata: {
            name: cafe.name,
            description: cafe.description || '',
            dietaryOptions: cafe.dietaryOptions as Record<string, boolean>,
            ambiance: cafe.ambiance as Record<string, boolean>,
            keywords: cafe.keywords || [],
            avgRating: cafe.avgRating,
            sentimentScore: cafe.sentimentScore
          }
        } satisfies SearchResult;
      })
      .sort((a, b) => b.score - a.score);
  }

  private calculateMatchScore(cafe: DbCafe, preferences: Preferences): number {
    let score = 0;
    const weights = {
      dietary: 0.4,
      ambiance: 0.3,
      activities: 0.3
    };

    if (preferences.dietary) {
      const dietaryOptions = cafe.dietaryOptions as Record<string, boolean>;
      const dietaryMatch = preferences.dietary.filter(
        (pref: string) => dietaryOptions && dietaryOptions[pref.toLowerCase()]
      ).length;
      score += (dietaryMatch / preferences.dietary.length) * weights.dietary;
    }

    if (preferences.ambiance) {
      const ambianceOptions = cafe.ambiance as Record<string, boolean>;
      const ambianceMatch = preferences.ambiance.filter(
        (pref: string) => ambianceOptions && ambianceOptions[pref.toLowerCase()]
      ).length;
      score += (ambianceMatch / preferences.ambiance.length) * weights.ambiance;
    }

    if (preferences.activities) {
      const keywords = cafe.keywords || [];
      const activityMatch = preferences.activities.filter((activity: string) =>
        keywords.includes(activity.toLowerCase())
      ).length;
      score += (activityMatch / preferences.activities.length) * weights.activities;
    }

    return score;
  }

  private generateMatchReason(cafe: DbCafe, preferences: Preferences): string {
    const matches: string[] = [];

    if (preferences.dietary) {
      const dietaryOptions = cafe.dietaryOptions as Record<string, boolean>;
      const dietaryMatches = preferences.dietary.filter(
        (pref: string) => dietaryOptions && dietaryOptions[pref.toLowerCase()]
      );
      if (dietaryMatches.length) {
        matches.push(`Offers ${dietaryMatches.join(', ')} options`);
      }
    }

    if (preferences.ambiance) {
      const ambianceOptions = cafe.ambiance as Record<string, boolean>;
      const ambianceMatches = preferences.ambiance.filter(
        (pref: string) => ambianceOptions && ambianceOptions[pref.toLowerCase()]
      );
      if (ambianceMatches.length) {
        matches.push(`${ambianceMatches.join(', ')} atmosphere`);
      }
    }

    return matches.length ? matches.join(' • ') : 'General match';
  }
}
