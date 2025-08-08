import { Router } from 'express';
import { AnalyzeRequestSchema } from '../schemas/analyze.schema';
import { withPage } from '../services/render.service';
import { runAxeOnPage } from '../services/axe.service';
import { runEqualAccess } from '../services/equalAccess.service';
import { mapAxeToUnified, mapEqualAccessToUnified, buildUnifiedResponse } from '../mappers/unifyResults';

/**
 * @openapi
 * tags:
 *   - name: Analyze
 *     description: Analizar accesibilidad (HTML o URL) con axe-core y Equal Access
 */
export const analyzeRouter = Router();

/**
 * @openapi
 * /api/analyze:
 *   post:
 *     summary: Analiza accesibilidad (HTML o URL)
 *     tags: [Analyze]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/AnalyzeRequest'
 *           examples:
 *             html-axe:
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html><html><head></head><body><h1>Hola</h1></body></html>"
 *                 tool: axe-core
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             url-equal-access:
 *               value:
 *                 inputType: url
 *                 value: "https://example.com"
 *                 tool: equal-access
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *     responses:
 *       200:
 *         description: Resultado unificado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnifiedResponse'
 */
analyzeRouter.post('/', async (req, res) => {
  const parse = AnalyzeRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, error: parse.error.format() });
  }
  const { inputType, value, tool, wcagVersion, wcagLevel } = parse.data;

  try {
    const parts = [];

    if (tool === 'axe-core' || tool === 'both') {
      const axeResult = await withPage(inputType, value, async (page) => {
        return runAxeOnPage(page);
      });
      parts.push(mapAxeToUnified(axeResult, wcagVersion, wcagLevel));
    }

    if (tool === 'equal-access' || tool === 'both') {
      const eaResult = await withPage(inputType, value, async (page) => {
        // Pasamos la Playwright Page directamente para mejor fidelidad
        const report = await runEqualAccess(page, `scan-${Date.now()}`);
        return report;
      });
      parts.push(mapEqualAccessToUnified(eaResult, wcagVersion, wcagLevel));
    }

    const unified = buildUnifiedResponse(parts);
    return res.json(unified);
  } catch (err: any) {
    req.log?.error({ err }, 'Analyze error');
    return res.status(500).json({ ok: false, error: err?.message ?? 'Internal error' });
  }
});