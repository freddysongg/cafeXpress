const API_BASE_URL = import.meta.env.PROD
  ? 'https://cafexpress-api-production.up.railway.app'
  : 'http://localhost:8000';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RecommendationRequest {
  userId?: string;
  location?: Location;
  preferences?: {
    dietary?: string[];
    activities?: string[];
    ambiance?: string[];
  };
}

export interface Recommendation {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  score: number;
  reason: string;
  confidenceScore: number;
  metadata: {
    name: string;
    description: string;
    address: string;
    rating: number;
    reviewCount: number;
    lastReviewDate: string;
    tags?: string[];
    sentimentScore?: {
      positive: number;
      negative: number;
      neutral: number;
      compound: number;
    };
    location?: Location;
  };
}

export interface RecommendationResponse {
  status: 'success' | 'error';
  data: Recommendation[];
  metadata?: {
    total: number;
    page: number;
    limit: number;
  };
  message?: string;
}

export async function getRecommendations(
  request: RecommendationRequest = {}
): Promise<Recommendation[]> {
  try {
    // Use a default user ID for non-authenticated requests
    const defaultUserId = 'guest';
    const userId = request.userId || defaultUserId;

    const url = new URL(`${API_BASE_URL}/recommendations/${userId}`);

    // Add query parameters
    if (request.location) {
      url.searchParams.append('latitude', request.location.latitude.toString());
      url.searchParams.append(
        'longitude',
        request.location.longitude.toString()
      );
    }

    // Add preferences as query parameters if they exist
    if (request.preferences?.dietary?.length) {
      url.searchParams.append('dietary', request.preferences.dietary.join(','));
    }
    if (request.preferences?.activities?.length) {
      url.searchParams.append(
        'activities',
        request.preferences.activities.join(',')
      );
    }
    if (request.preferences?.ambiance?.length) {
      url.searchParams.append(
        'ambiance',
        request.preferences.ambiance.join(',')
      );
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
      throw new Error(result.message || 'Failed to fetch recommendations');
    }
    return result.data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
}
