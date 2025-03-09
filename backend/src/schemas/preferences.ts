import { z } from 'zod';

// Zod schema for preferences request
export const PreferencesSchema = z.object({
  userId: z.string(),
  preferences: z.object({
    dietary: z.array(z.string()),
    ambiance: z.array(z.string()),
    activities: z.array(z.string()),
    drinks: z.array(z.string()),
    vibes: z.array(z.string()),
    coffee: z.array(z.string())
  }),
  createdAt: z.date().optional()
});

export const UpdatePreferencesSchema = z.object({
  preferences: z.object({
    dietary: z.array(z.string()),
    ambiance: z.array(z.string()),
    activities: z.array(z.string()),
    drinks: z.array(z.string()),
    vibes: z.array(z.string()),
    coffee: z.array(z.string())
  })
});

// TypeScript type inferred from the Zod schema
export type PreferencesType = z.infer<typeof PreferencesSchema>;
export type UpdatePreferencesType = z.infer<typeof UpdatePreferencesSchema>;
