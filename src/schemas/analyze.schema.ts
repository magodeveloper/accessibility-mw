import { z } from 'zod';

export const AnalyzeRequestSchema = z.object({
  inputType: z.enum(['html', 'url']),
  value: z.string().min(1, 'value requerido'),
  tool: z.enum(['axe-core', 'equal-access', 'both']).default('axe-core'),
  wcagVersion: z.enum(['2.0', '2.1', '2.2']).default('2.2'),
  wcagLevel: z.enum(['A', 'AA', 'AAA']).default('AA')
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;