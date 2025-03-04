import { db } from '@config/db.js';
import { cafes, reviews } from '@config/schemas.js';
import { sql } from 'drizzle-orm';
import type { KeywordMatch } from '@schemas/recommendation.js';

export const getReviewStats = () =>
  db
    .select({
      cafeId: reviews.cafeId,
      avgRating: sql<number>`AVG(CAST(${reviews.rating} AS float))`.as('avg_rating'),
      reviewCount: sql<number>`COUNT(${reviews.id})`.as('review_count')
    })
    .from(reviews)
    .groupBy(reviews.cafeId)
    .as('review_stats');

export const buildKeywordConditions = (keywords: KeywordMatch[]) => {
  const ambianceKeywords = keywords
    .filter((k) => k.category === 'ambiance')
    .map((k) => k.keyword.toLowerCase());

  const dietaryKeywords = keywords
    .filter((k) => k.category === 'dietary')
    .map((k) => k.keyword.toLowerCase());

  const generalKeywords = keywords
    .filter((k) => k.category === 'general')
    .map((k) => k.keyword.toLowerCase());

  console.log('Building keyword conditions:', {
    ambianceKeywords,
    dietaryKeywords,
    generalKeywords
  });

  return sql`(
        ${
          ambianceKeywords.length > 0
            ? sql`EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(${cafes.ambiance}) AS a
                WHERE LOWER(a) = ANY(${sql`ARRAY[${sql.join(ambianceKeywords, sql`, `)}]::text[]`})
            )`
            : sql`TRUE`
        }
        OR
        ${
          dietaryKeywords.length > 0
            ? sql`EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(${cafes.dietaryOptions}) AS d
                WHERE LOWER(d) = ANY(${sql`ARRAY[${sql.join(dietaryKeywords, sql`, `)}]::text[]`})
            )`
            : sql`TRUE`
        }
        OR
        ${
          generalKeywords.length > 0
            ? sql`EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(${cafes.keywords}) AS k
                WHERE LOWER(k) = ANY(${sql`ARRAY[${sql.join(generalKeywords, sql`, `)}]::text[]`})
            )`
            : sql`TRUE`
        }
    )`;
};

export const calculateDistance = (latitude: number, longitude: number) =>
  sql<number>`
    ROUND(
      CAST(
        3959 * 2 * asin(
          sqrt(
            power(sin(radians(${latitude} - CAST(CAST(${cafes.location}->>'coordinates' AS json)->>1 AS float)) / 2), 2) +
            cos(radians(${latitude})) *
            cos(radians(CAST(CAST(${cafes.location}->>'coordinates' AS json)->>1 AS float))) *
            power(sin(radians(${longitude} - CAST(CAST(${cafes.location}->>'coordinates' AS json)->>0 AS float)) / 2), 2)
          )
        )
      AS numeric),
      2
    ) AS calc_distance
  `;

export const getCafesWithKeywords = (
  keywordConditions: ReturnType<typeof buildKeywordConditions>,
  filterConditions: any,
  distanceCalc: ReturnType<typeof calculateDistance>,
  radius: number
) =>
  db
    .select({
      id: sql<string>`cafes.id`,
      name: sql<string>`cafes.name`,
      description: sql<string>`cafes.description`,
      address: sql<string>`cafes.address`,
      keywords: sql<string[]>`cafes.keywords`,
      ambiance: sql<Record<string, boolean>>`cafes.ambiance`,
      dietaryOptions: sql<Record<string, boolean>>`cafes.dietary_options`,
      location: sql<any>`cafes.location`,
      photos: sql<string[]>`cafes.photos`,
      rating: sql<number>`COALESCE(review_stats.avg_rating, 3.5)`,
      reviewCount: sql<number>`COALESCE(review_stats.review_count, 0)`,
      distance: sql<number>`calc_distance`,
      matchScore: sql<number>`
            ${keywordConditions}
            AND ${filterConditions}
            AND calc_distance <= ${radius}
        `,
      totalCount: sql<number>`COUNT(*) OVER()`
    })
    .from(
      sql<any>`(
            SELECT *, ${distanceCalc}
            FROM ${cafes}
        ) AS cafes`
    )
    .leftJoin(getReviewStats(), sql`cafes.id = review_stats.cafe_id`);
