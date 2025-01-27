// Schema for Cafe Params
export interface CafeParams {
  cafeId: string;
}

// Schema for Cafe Body
export interface CafeBody {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  ownerId: string;
  ambiance?: object;
  dietaryOptions?: object;
  location?: { type: string; coordinates: number[] };
  semanticEmbedding?: number[];
}
