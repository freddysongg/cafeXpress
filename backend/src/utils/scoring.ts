import type { KeywordMatch, UserPreferences, CafeRecommendation } from '@schemas/recommendation.js';

const WEIGHTS = {
  search: 0.5, // User search query weight
  preferences: 0.3, // User preferences weight
  rating: 0.1, // Cafe rating weight
  distance: 0.1 // Location distance weight
};

/**
 * Calculates cafe score based on matching keywords and other factors
 */
export const calculateScore = (
  cafe: any,
  keywords: KeywordMatch[],
  userPrefs?: UserPreferences,
  hasSearchQuery: boolean = false
): number => {
  const searchKeywords = keywords.filter((k) => k.confidence > 1.0);
  const prefKeywords = keywords.filter((k) => k.confidence <= 1.0);

  // Calculate component scores
  const searchScore =
    searchKeywords.length > 0
      ? searchKeywords.reduce((sum, k) => sum + k.confidence, 0) / searchKeywords.length
      : 0;

  const prefScore =
    prefKeywords.length > 0
      ? prefKeywords.reduce((sum, k) => sum + k.confidence, 0) / prefKeywords.length
      : 0;

  const ratingScore = (cafe.rating - 3.5) / 1.5;
  const distanceScore = Math.max(0, 1 - (cafe.distance || 0) / 10);

  // Adjust weights based on context
  const adjustedWeights = { ...WEIGHTS };
  if (!hasSearchQuery) adjustedWeights.search = 0;
  if (!userPrefs) adjustedWeights.preferences = 0;

  // Normalize weights
  const totalWeight = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);
  Object.keys(adjustedWeights).forEach((key) => {
    adjustedWeights[key as keyof typeof WEIGHTS] /= totalWeight;
  });

  // Calculate final score
  return Math.max(
    0,
    Math.min(
      1,
      searchScore * adjustedWeights.search +
        prefScore * adjustedWeights.preferences +
        ratingScore * adjustedWeights.rating +
        distanceScore * adjustedWeights.distance
    )
  );
};

/**
 * Ranks cafes based on distance only
 * Used when no keywords or preferences are provided
 */
export const rankByDistance = (cafes: any[]): CafeRecommendation[] => {
  return cafes
    .map((cafe) => ({
      id: cafe.id,
      name: cafe.name,
      description: cafe.description,
      address: cafe.address,
      distance: Number(cafe.distance),
      matchingKeywords: [], // No keywords for distance-only ranking
      score: 1 / (cafe.distance + 1),
      metadata: {
        rating: cafe.rating,
        reviewCount: cafe.reviewCount,
        keywords: cafe.keywords,
        location: {
          coordinates: [cafe.location.coordinates[0], cafe.location.coordinates[1]] as [
            number,
            number
          ],
          type: 'Point' as const
        },
        photos: cafe.photos
      }
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
};

/**
 * Ranks and scores cafes based on matching keywords and user preferences
 * @param cafes - Array of cafe data to rank
 * @param keywords - Array of keyword matches to consider
 * @param getMatchingKeywords - Function to get matching keywords for a cafe
 * @param userPrefs - Optional user preferences
 * @param hasSearchQuery - Whether there was a search query
 * @returns Sorted array of cafe recommendations
 */
export const rankAndScoreCafes = (
  cafes: any[],
  keywords: KeywordMatch[],
  getMatchingKeywords: (cafe: any, keywords: KeywordMatch[]) => KeywordMatch[],
  userPrefs?: UserPreferences,
  hasSearchQuery: boolean = false
): CafeRecommendation[] => {
  return cafes
    .map((cafe) => {
      const matchingKeywords = getMatchingKeywords(cafe, keywords).map((keyword) => ({
        ...keyword,
        confidence: keyword.confidence * (cafe.rating / 5.0)
      }));

      const score = calculateScore(cafe, matchingKeywords, userPrefs, hasSearchQuery);

      return {
        id: cafe.id,
        name: cafe.name,
        description: cafe.description,
        address: cafe.address,
        distance: Number(cafe.distance),
        matchingKeywords,
        score: Number(score.toFixed(2)),
        metadata: {
          rating: cafe.rating,
          reviewCount: cafe.reviewCount,
          keywords: cafe.keywords,
          location: {
            coordinates: [cafe.location.coordinates[0], cafe.location.coordinates[1]] as [
              number,
              number
            ],
            type: 'Point' as const
          },
          photos: cafe.photos
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
};
