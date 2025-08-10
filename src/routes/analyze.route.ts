import { Router } from 'express';
import { abortAfter } from '../utils/timing';
import { withPage } from '../services/render.service';
import { runAxeOnPage } from '../services/axe.service';
import { validatePublicHttpUrl } from '../utils/security';
import { runEqualAccess } from '../services/equalAccess.service';
import { AnalyzeRequestSchema } from '../schemas/analyze.schema';
import { mapAxeToUnified, mapEqualAccessToUnified, buildUnifiedResponse } from '../mappers/unifyResults';

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
 *             $ref: '#/components/schemas/AnalyzeRequest'
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
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno
 */
analyzeRouter.post('/', async (req, res) => {

  const requestId = (req as any).id;

  const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS ?? 60000);
  const NAVIGATION_TIMEOUT_MS = Number(process.env.NAVIGATION_TIMEOUT_MS ?? 30000);
  // margen extra para el wrapper externo (evita doble disparo simultáneo)
  const WRAP_MARGIN_MS = 500;

  // 1) Validación rápida de payload
  const parse = AnalyzeRequestSchema.safeParse(req.body);
  if (!parse.success) {
    const flat = parse.error.flatten();
    const fieldMsgs = Object.values(flat.fieldErrors).flat().filter(Boolean);
    const message = [...flat.formErrors, ...fieldMsgs].join(', ') || 'Datos inválidos';

    req.log?.warn({ requestId, message, details: flat }, 'Analyze blocked by schema');
    return res.status(400).json({
      ok: false,
      error: message,
      // En prod podrías ocultar details para no filtrar estructura interna
      details: process.env.NODE_ENV === 'production' ? undefined : flat,
      requestId
    });
  }

  const { inputType, value, tool, wcagVersion, wcagLevel } = parse.data;

  try {
    // 2) Validación fuerte de URL (SSRF/puertos/redirects)
    let navValue = value;
    if (inputType === 'url') {
      await validatePublicHttpUrl(value, {
        fetchBody: false,
        requireHtmlContentType: false,
        throwOnError: true
      });
      // si no lanzó, puedes normalizar tomando la propia value
      navValue = value;
    }
    // 3) Ejecutar herramientas seleccionadas
    type ToolResult = ReturnType<typeof mapAxeToUnified> | ReturnType<typeof mapEqualAccessToUnified>;
    const parts: ToolResult[] = [];

    if (tool === 'axe-core' || tool === 'both') {
      const axeRaw = await abortAfter(
        ANALYZE_TIMEOUT_MS + WRAP_MARGIN_MS,
        withPage(
          inputType,
          navValue,
          async (page) => runAxeOnPage(page),
          { overallTimeoutMs: ANALYZE_TIMEOUT_MS, navTimeoutMs: NAVIGATION_TIMEOUT_MS }
        ),
        { tool: 'axe-core', phase: 'withPage/axe' }
      );
      parts.push(mapAxeToUnified(axeRaw, wcagVersion, wcagLevel));
    }

    if (tool === 'equal-access' || tool === 'both') {
       const eaReport = await abortAfter(
        ANALYZE_TIMEOUT_MS + WRAP_MARGIN_MS,
        withPage(
          inputType,
          navValue,
          async (page) => runEqualAccess(page, `scan-${Date.now()}`),
          { overallTimeoutMs: ANALYZE_TIMEOUT_MS, navTimeoutMs: NAVIGATION_TIMEOUT_MS }
        ),
        { tool: 'equal-access', phase: 'withPage/equal-access' }
      );
      parts.push(mapEqualAccessToUnified(eaReport, wcagVersion, wcagLevel));
    }

    // Defensa: si por alguna razón no agregó nada
    if (parts.length === 0) {
      req.log?.warn({ requestId, tool }, 'No tool selected after validation');
      return res.status(400).json({
        ok: false,
        error: 'No se seleccionó ninguna herramienta válida',
        requestId
      });
    }

    // 4) Unificar y responder
    const unified = buildUnifiedResponse(parts as any);
    return res.json(unified);
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    const isTimeout = /timeout/i.test(msg);
    const status = isTimeout ? 504 : 500;
    req.log?.error({ requestId, err }, 'Analyze error');
    return res.status(status).json({
      ok: false,
      error: isTimeout ? 'Analysis timed out' : (err?.message ?? 'Internal error'),
      requestId
    });
  }
});