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
  ambiance?: object;
  dietaryOptions?: object;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  semanticEmbedding?: {
    vector: number[];
    metadata: {
      type: 'cafe';
      id: string;
      keywords: string[];
      createdAt: Date;
      updatedAt: Date;
    };
  };
}

// Define the schema for the request body
export const CafeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  ambiance: z.record(z.boolean()).optional(),
  dietaryOptions: z.record(z.boolean()).optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number()
    })
    .transform(({ latitude, longitude }) => ({
      type: 'Point' as const,
      coordinates: [longitude, latitude] as [number, number]
    })),
  semanticEmbedding: z
    .object({
      vector: z.array(z.number()),
      metadata: z.object({
        type: z.literal('cafe'),
        id: z.string(),
        keywords: z.array(z.string()),
        createdAt: z.date(),
        updatedAt: z.date()
      })
    })
    .optional()
});

// Infer the TypeScript type from the schema
export type Cafe = z.infer<typeof CafeSchema>;
