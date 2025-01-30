import { z } from 'zod';

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

// Define the schema for the request body
export const CafeSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  address: z.string().min(1, { message: 'Address is required' }),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(1, { message: 'State is required' }),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, { message: 'Invalid ZIP code' }),
  ownerId: z.string().min(1, { message: 'Owner ID is required' }),
  ambiance: z.string().optional(),
  dietaryOptions: z.array(z.string()).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
  semanticEmbedding: z.array(z.number()).optional()
});

// Infer the TypeScript type from the schema
export type Cafe = z.infer<typeof CafeSchema>;
