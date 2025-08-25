import { z } from 'zod';

export const AnalyzeRequestSchema = z
  .object({
    inputType: z.enum(['html', 'url']),
    value: z.string().trim().min(1, 'value requerido'),
    tool: z.enum(['axe-core', 'equal-access', 'both']).default('axe-core'),
    wcagVersion: z.enum(['2.0', '2.1', '2.2']).default('2.2'),
    wcagLevel: z.enum(['A', 'AA', 'AAA']).default('AA'),
    cumulativeWcag: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    // Si es URL, validar formato seguro
    if (data.inputType === 'url') {
      try {
        const url = new URL(data.value);
        if (!/^https?:$/.test(url.protocol)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Solo se permiten URLs http(s)',
            path: ['value'],
          });
        }
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'URL inválida',
          path: ['value'],
        });
      }
    }
  });

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
