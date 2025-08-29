import { z } from 'zod';

export const createPollSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(5,'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  options: z.array(z.string())
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed')
    .refine((options) => options.every(option => option.trim().length > 0), 'All options must be non-empty')
    .refine((options) => new Set(options.map(o => o.trim())).size === options.length, 'All options must be unique'),
  ends_at: z.date().optional(),
  is_public: z.boolean().default(true),
});

export const voteSchema = z.object({
  poll_id: z.string().uuid(),
  option_id: z.string().uuid(),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;