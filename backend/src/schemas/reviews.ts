export interface ReviewBody {
  userId: string;
  cafeId: string;
  rating: number;
  description: string;
  title: string;
  sentimentScore: {
    positive: number;
    negative: number;
    neutral: number;
    compound: number;
  };
  entities?: Array<{
    name: string;
    type: string;
    salience: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }>;
}

export interface ReviewParams {
  reviewId: string;
}

export interface CafeParams {
  cafeId: string;
}
