const API_BASE_URL = import.meta.env.PROD
  ? 'https://cafexpress-api-production.up.railway.app'
  : 'http://localhost:8000';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface SearchRequest {
  query?: string;
  location?: Location;
  filters?: {
    dietary?: string[];
    activities?: string[];
    ambiance?: string[];
    radius?: number;
  };
  userId?: string;
}

export type KeywordMatch = {
  keyword: string;
  confidence: number;
  category: 'ambiance' | 'dietary' | 'activity' | 'general';
  isNegated: boolean;
  importance: number;
  context?: {
    isExplicit?: boolean;
    isHistorical?: boolean;
    isPriority?: boolean;
    uncertainty?: {
      isUncertain: boolean;
      strength: number;
    };
    matchDetails?: {
      matchedTerms: string[];
      similarityScore: number;
    };
  };
};

export interface CafeRecommendation {
  id: string;
  name: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  ambiance?: string[] | string;
  dietaryOptions?: string[] | string;
  location: {
    coordinates: [number, number];
    type: 'Point';
  };
  photos?: string[];
  hours?: {
    today?: string;
    [key: string]: string | undefined;
  };
  rating: number;
  numOfRatings: number;
  status?: string;
  createdAt?: string;
  phone?: string;
  keywords: string[];
  matchingKeywords?: KeywordMatch[];
  score: number;
  distance?: number;
  metadata: {
    rating: number;
    reviewCount: number;
    keywords: string[];
    location: {
      coordinates: [number, number];
      type: 'Point';
    };
    photos?: string[];
  };
}

export interface RecommendationResponse {
  status: 'success' | 'error';
  data: CafeRecommendation[];
  metadata: {
    total: number;
    cached: boolean;
    generatedAt: string;
    expiresAt?: string;
    source: 'cache' | 'search' | 'preferences' | 'location';
  };
}

export async function getRecommendations(
  request: SearchRequest = {}
): Promise<CafeRecommendation[]> {
  try {
    const url = new URL(`${API_BASE_URL}/recommendations/search`);

    // Add query parameters
    if (request.query) {
      url.searchParams.append('q', request.query);
    }
    if (request.location) {
      url.searchParams.append('latitude', request.location.latitude.toString());
      url.searchParams.append(
        'longitude',
        request.location.longitude.toString()
      );
    }
    if (request.filters?.dietary?.length) {
      url.searchParams.append('dietary', request.filters.dietary.join(','));
    }
    if (request.filters?.activities?.length) {
      url.searchParams.append(
        'activities',
        request.filters.activities.join(',')
      );
    }
    if (request.filters?.ambiance?.length) {
      url.searchParams.append('ambiance', request.filters.ambiance.join(','));
    }
    if (request.filters?.radius) {
      url.searchParams.append('radius', request.filters.radius.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }

    const result = (await response.json()) as RecommendationResponse;
    if (result.status === 'error' || !result.data) {
      throw new Error('Failed to fetch recommendations');
    }
    return result.data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
}

export const getCafeById = async (id: string): Promise<CafeRecommendation> => {
  const response = await fetch(`${API_BASE_URL}/cafe/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch cafe details');
  }
  return response.json();
};
