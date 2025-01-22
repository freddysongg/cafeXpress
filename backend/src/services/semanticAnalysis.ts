import { db } from '@config/db.js';
import { reviews } from '@config/schemas.js';
import type { GeminiClient } from '@schemas/gemini.js';
import { setTimeout } from 'timers/promises';
import { sql, eq } from 'drizzle-orm';
import type { ReviewAnalysis } from '@schemas/semantic.js';

type SentimentLabel = 'positive' | 'negative' | 'neutral';

const BATCH_SIZE = 50;
const PROCESSING_INTERVAL = 60 * 60 * 1000; // 1 hour

export class SemanticAnalysisService {
  private gemini: GeminiClient;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(geminiClient: GeminiClient) {
    this.gemini = geminiClient;
  }

  async analyzeReviewBatch(reviews: { id: string; text: string }[]) {
    const results: ReviewAnalysis[] = [];

    for (const review of reviews) {
      try {
        const { sentiment, entities } = await this.gemini.analyzeText(review.text);
        // Transform Gemini sentiment scores to match database schema
        const compoundScore = sentiment.compound;
        const sentimentLabel: SentimentLabel =
          compoundScore >= 0.7 ? 'positive' : compoundScore <= 0.3 ? 'negative' : 'neutral';

        const sentimentScore = {
          positive: sentiment.positive,
          negative: sentiment.negative,
          neutral: sentiment.neutral,
          compound: sentiment.compound
        };

        results.push({
          id: review.id,
          text: review.text,
          content: review.text,
          sentiment: sentimentLabel,
          sentimentScore,
          entities: Array.isArray(entities)
            ? entities.map((entity) => ({
                name: entity,
                type: 'keyword',
                salience: 1.0
              }))
            : undefined
        });
      } catch (error) {
        console.error(`Failed to analyze review ${review.id}:`, error);
      }
    }

    return results;
  }

  async processReviews() {
    let offset = 0;
    while (true) {
      const reviewBatch = await db
        .select({
          id: reviews.id,
          text: reviews.text
        })
        .from(reviews)
        .where(sql`${reviews.processedAt} IS NULL`)
        .limit(BATCH_SIZE)
        .offset(offset);

      if (reviewBatch.length === 0) break;

      const analyzed = await this.analyzeReviewBatch(reviewBatch);
      await this.updateReviews(analyzed);

      offset += BATCH_SIZE;
      await setTimeout(1000); // Rate limit
    }
  }

  async updateReviews(analyzed: ReviewAnalysis[]) {
    for (const analysis of analyzed) {
      await db
        .update(reviews)
        .set({
          sentimentScore: analysis.sentimentScore,
          entities: analysis.entities,
          processedAt: new Date()
        })
        .where(eq(reviews.id, analysis.id));
    }
  }

  startPeriodicProcessing() {
    this.processingInterval = setInterval(() => this.processReviews(), PROCESSING_INTERVAL);
  }

  stopPeriodicProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}
