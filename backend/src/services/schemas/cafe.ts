import { z } from 'zod';

// Define the schema for a cafe
export const CafeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  ownerId: z.string().optional(),
  ambiance: z.record(z.string(), z.boolean()).optional(), // Object with string keys/values
  dietaryOptions: z.record(z.string(), z.boolean()).optional()
});

// Define the schema for updating a cafe (all fields optional)
export const UpdateCafeSchema = CafeSchema.partial();

// Export types
export type Cafe = z.infer<typeof CafeSchema>;
export type UpdateCafe = z.infer<typeof UpdateCafeSchema>;
