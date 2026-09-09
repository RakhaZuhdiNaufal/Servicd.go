import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5'),
  comment: z.string().optional().nullable()
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
