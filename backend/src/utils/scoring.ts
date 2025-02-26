import type { KeywordMatch, UserPreferences, CafeRecommendation } from '@schemas/recommendation.js';

const BASE_WEIGHTS = {
  preferences: 0.6,
  search: 0.3,
  rating: 0.05,
  distance: 0.05
};

function calculateDynamicWeights(hasPreferences: boolean, hasSearchQuery: boolean) {
  const weights = { ...BASE_WEIGHTS };

  if (hasPreferences && hasSearchQuery) {
    weights.preferences = 0.7;
    weights.search = 0.2;
    weights.rating = 0.05;
    weights.distance = 0.05;
  } else if (hasPreferences) {
    weights.preferences = 0.8;
    weights.search = 0;
    weights.rating = 0.1;
    weights.distance = 0.1;
  } else if (hasSearchQuery) {
    weights.preferences = 0;
    weights.search = 0.9;
    weights.rating = 0.05;
    weights.distance = 0.05;
  } else {
    weights.preferences = 0;
    weights.search = 0;
    weights.rating = 0.2;
    weights.distance = 0.8;
  }

  return weights;
}

export const calculateScore = (
  cafe: any,
  keywords: KeywordMatch[],
  userPrefs?: UserPreferences,
  hasSearchQuery: boolean = false
): number => {
  const weights = calculateDynamicWeights(!!userPrefs, hasSearchQuery);

  const groupedKeywords = keywords.reduce(
    (groups, k) => {
      const group = k.context.isExplicit ? 'search' : 'preferences';
      if (!groups[group]) groups[group] = [];
      groups[group].push(k);
      return groups;
    },
    {} as Record<string, KeywordMatch[]>
  );

  const searchScore = groupedKeywords.search?.length
    ? calculateGroupScore(groupedKeywords.search)
    : 0;
  const prefScore = groupedKeywords.preferences?.length
    ? calculateGroupScore(groupedKeywords.preferences)
    : 0;

  const ratingScore = (cafe.rating - 3.5) / 1.5;
  const distanceScore = Math.max(0, 1 - (cafe.distance || 0) / 10);

  return Math.max(
    0,
    Math.min(
      1,
      searchScore * weights.search +
        prefScore * weights.preferences +
        ratingScore * weights.rating +
        distanceScore * weights.distance
    )
  );
};

function calculateGroupScore(keywords: KeywordMatch[]): number {
  const sortedKeywords = [...keywords].sort((a, b) => {
    const aCertainty = a.context.uncertainty?.strength || 0;
    const bCertainty = b.context.uncertainty?.strength || 0;
    if (aCertainty !== bCertainty) return bCertainty - aCertainty;
    return b.importance - a.importance;
  });

  let totalScore = 0;
  let weightSum = 0;

  const negationGroups = new Map<string, KeywordMatch[]>();
  sortedKeywords.forEach((kw) => {
    const key = kw.context.grammarGroup || 'default';
    if (!negationGroups.has(key)) {
      negationGroups.set(key, []);
    }
    negationGroups.get(key)!.push(kw);
  });

  for (const [groupKey, group] of negationGroups) {
    const isCompoundNegation = group.length > 1 && group[0].isNegated;
    const isAndGroup = groupKey.includes('and');

    group.forEach((keyword, index) => {
      let score = Math.abs(keyword.confidence) * keyword.importance;

      if (keyword.context.uncertainty?.isUncertain) {
        const strength = keyword.context.uncertainty.strength;
        score *= strength;
      }

      // Handle different types of negations
      if (isCompoundNegation && isAndGroup) {
        // For "not A and B", both terms should be negated
        score = 1 - score;
      } else if (isCompoundNegation && !isAndGroup) {
        // For "not A but B", only negate the first term
        if (index === 0 || keyword.isNegated) {
          score = 1 - score;
        }
      } else if (keyword.isNegated) {
        // Handle individual negations
        score = 1 - score;
      }

      const positionWeight = 1 - index * 0.1;
      const contextualWeight = keyword.context.isPriority ? 1.2 : 1.0;

      totalScore += score * positionWeight * contextualWeight;
      weightSum += positionWeight * contextualWeight;
    });
  }

  return weightSum > 0 ? totalScore / weightSum : 0;
}

export const rankByDistance = (cafes: any[]): CafeRecommendation[] => {
  return cafes
    .map((cafe) => ({
      id: cafe.id,
      name: cafe.name,
      description: cafe.description,
      address: cafe.address,
      distance: Number(cafe.distance),
      matchingKeywords: [],
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

function createMatchResult(keyword: KeywordMatch, matchedTerms: string[]): KeywordMatch {
  return {
    keyword: keyword.keyword,
    confidence: keyword.confidence,
    category: keyword.category,
    isNegated: keyword.isNegated,
    importance: keyword.importance,
    context: {
      isExplicit: keyword.context.isExplicit,
      isHistorical: keyword.context.isHistorical || false,
      isPriority: keyword.context.isPriority,
      uncertainty: keyword.context.uncertainty,
      matchDetails: {
        matchedTerms,
        similarityScore: Math.abs(keyword.confidence)
      }
    }
  };
}

export const rankAndScoreCafes = (
  cafes: any[],
  keywords: KeywordMatch[],
  getMatchingKeywords: (cafe: any, keywords: KeywordMatch[]) => KeywordMatch[],
  userPrefs?: UserPreferences,
  hasSearchQuery: boolean = false
): CafeRecommendation[] => {
  return cafes
    .map((cafe) => {
      const matchingKeywords = getMatchingKeywords(cafe, keywords).map((match) =>
        createMatchResult(match, match.context.matchDetails?.matchedTerms || [])
      );

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
