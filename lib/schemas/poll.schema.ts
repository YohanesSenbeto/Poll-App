import { z } from 'zod';

export const programmingLanguages = [
  'Python',
  'Java',
  'JavaScript',
  'R',
  'C/C++',
  'C#',
  'Objective C',
  'Swift',
  'PHP',
  'Matlab'
] as const;

export const createPollSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(5, 'Description must be at least 5 characters')
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  languages: z
    .array(z.enum(programmingLanguages))
    .length(4, 'Please select exactly 4 programming languages')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'Duplicate languages selected',
    }),
  ends_at: z.date().optional(),
  is_public: z.boolean().default(true)
});

export const voteSchema = z.object({
  poll_id: z.string().uuid(),
  option_id: z.string().uuid()
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;