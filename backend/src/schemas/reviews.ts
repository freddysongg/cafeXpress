export interface ReviewBody {
  userId: string;
  cafeId: string;
  rating: number;
  text: string;
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
