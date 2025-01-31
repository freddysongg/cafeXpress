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
  name: z.string(),
  description: z.string().optional(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  ownerId: z.string(),
  ambiance: z.record(z.boolean()).optional(), // Allow ambiance to be an object
  dietaryOptions: z.record(z.boolean()).optional(), // Allow dietaryOptions to be an object
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
  semanticEmbedding: z.array(z.number()).optional()
});

// Infer the TypeScript type from the schema
export type Cafe = z.infer<typeof CafeSchema>;
