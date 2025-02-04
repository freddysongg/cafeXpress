import { z } from 'zod';

// Zod schema for preferences request
export const CreatePreferencesSchema = z.object({
  userId: z.string(),
  favoriteCafes: z.array(z.string()),
  dietaryRestrictions: z.array(z.string()),
  ambiance: z.array(z.string()),
  semanticEmbedding: z
    .object({
      vector: z.array(z.number()),
      metadata: z.object({
        type: z.enum(['user', 'preferences', 'cafe']),
        id: z.string(),
        createdAt: z.date().optional()
      })
    })
    .nullable()
});

// TypeScript type inferred from the Zod schema
export type PreferencesSchema = z.infer<typeof CreatePreferencesSchema>;
