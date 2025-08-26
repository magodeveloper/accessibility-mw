import * as express from 'express';
import * as fs from 'fs';
import { UnifiedResponse } from '../mappers/unifyResults';
import { error, success } from '../utils/response';
import {
  getWcagCriterionId,
  getWcagMapping,
  WcagLevel,
  WcagVersion,
} from '../utils/wcag-mapping';
import {
  buildUnified,
  extractStats,
  runAnalysisTools,
  validateAndSanitizeInput,
  validateUrlIfNeeded,
} from './analyze.helpers';

// Interfaces para tipos de datos específicos
interface LogData {
  [key: string]: unknown;
}

// Removed unused types

interface HttpClientData {
  [key: string]: unknown;
}

interface ToolStats {
  violations?: number;
  needsReview?: number;
  recommendations?: number;
  passes?: number;
  incomplete?: number;
  inapplicable?: number;
}

interface AnalysisStats {
  axeStats?: ToolStats;
  eaStats?: ToolStats;
}

interface AnalysisItem {
  id?: string;
  ruleId?: string;
  tool?: 'axe-core' | 'equal-access';
  type?: string;
  impact?: string;
  help?: string;
  message?: string;
  helpUrl?: string;
  nodes?: AnalysisNode[];
  wcag?: {
    version?: WcagVersion;
    level?: WcagLevel;
    criterion?: string;
  };
}

interface AnalysisNode {
  target?: string[];
  html?: string;
  snippet?: string;
  failureSummary?: string;
  path?: {
    dom?: string;
    aria?: string;
  };
}

interface AnalysisPayload {
  userId: number;
  dateAnalysis: string;
  contentType: string;
  contentInput: string;
  sourceUrl: string | undefined;
  toolUsed: string;
  status: string;
  summaryResult: string;
  resultJson: string;
  durationMs: number;
  wcagVersion?: string;
  wcagLevel?: string;
  axeViolations?: number;
  axeNeedsReview?: number;
  axeRecommendations?: number;
  axePasses?: number;
  axeIncomplete?: number;
  axeInapplicable?: number;
  eaViolations?: number;
  eaNeedsReview?: number;
  eaRecommendations?: number;
  eaPasses?: number;
  eaIncomplete?: number;
  eaInapplicable?: number;
  [key: string]: unknown; // Para compatibilidad con HttpClientData
}

interface ErrorPayload {
  resultId: number;
  wcagCriterionId: number;
  errorCode: string;
  description: string;
  location: string;
  message: string;
  code: string;
  [key: string]: unknown; // Para compatibilidad con HttpClientData
}

// Optimized logger utility
interface Logger {
  info: (message: string, data?: LogData) => void;
  warn: (message: string, data?: LogData) => void;
  error: (message: string, data?: LogData) => void;
  debug: (message: string, data?: LogData) => void;
}

// Tipo extendido para el resultado de buildUnified
type ExtendedUnifiedResponse = UnifiedResponse & {
  meta: UnifiedResponse['meta'] & {
    inputType?: string;
    value?: string;
    tool?: string;
    duration?: number;
  };
};

// Functions

const createOptimizedLogger = (
  requestId: string,
  req?: express.Request
): Logger => {
  const isDev = process.env.NODE_ENV !== 'production';
  const enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true';

  const logToFile = (level: string, message: string, data?: LogData) => {
    if (!enableFileLogging) return;
    try {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` - ${JSON.stringify(data)}` : '';
      const logEntry = `[${timestamp}] [${level}] [${requestId}] ${message}${dataStr}\n`;
      fs.appendFileSync('debug_log.txt', logEntry);
    } catch (err) {
      // Silently ignore file logging errors to prevent app crashes
      if (isDev)
        console.warn('Failed to write to debug log:', (err as Error).message);
    }
  };

  return {
    info: (message: string, data?: LogData) => {
      if (isDev) console.log(`ℹ️ [${requestId}] ${message}`, data || '');
      (
        req as express.Request & {
          log?: { info: (data: LogData, message: string) => void };
        }
      )?.log?.info({ requestId, ...data }, message);
      logToFile('INFO', message, data);
    },
    warn: (message: string, data?: LogData) => {
      if (isDev) console.warn(`⚠️ [${requestId}] ${message}`, data || '');
      (
        req as express.Request & {
          log?: { warn: (data: LogData, message: string) => void };
        }
      )?.log?.warn({ requestId, ...data }, message);
      logToFile('WARN', message, data);
    },
    error: (message: string, data?: LogData) => {
      if (isDev) console.error(`❌ [${requestId}] ${message}`, data || '');
      (
        req as express.Request & {
          log?: { error: (data: LogData, message: string) => void };
        }
      )?.log?.error({ requestId, ...data }, message);
      logToFile('ERROR', message, data);
    },
    debug: (message: string, data?: LogData) => {
      if (isDev) console.log(`🔍 [${requestId}] ${message}`, data || '');
      logToFile('DEBUG', message, data);
    },
  };
};

// Optimized HTTP client with timeout and retry logic
const createHttpClient = () => {
  const DEFAULT_TIMEOUT = 10000; // 10 seconds

  return {
    async post(
      url: string,
      data: HttpClientData,
      headers: Record<string, string> = {},
      timeout = DEFAULT_TIMEOUT
    ) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
  };
};

const httpClient = createHttpClient();

// Configuration constants
const ANALYSIS_API_URL =
  process.env.ANALYSIS_API_URL || 'http://localhost:8082';
const analyzeRouter = express.Router();

interface AnalysisConfig {
  ANALYZE_TIMEOUT_MS: number;
  NAVIGATION_TIMEOUT_MS: number;
  WRAP_MARGIN_MS: number;
}

// Configuration object
const getAnalysisConfig = (): AnalysisConfig => ({
  ANALYZE_TIMEOUT_MS: Number(process.env.ANALYZE_TIMEOUT_MS ?? 60000),
  NAVIGATION_TIMEOUT_MS: Number(process.env.NAVIGATION_TIMEOUT_MS ?? 30000),
  WRAP_MARGIN_MS: 500,
});

// Utility functions
const mapImpactToSeverity = (impact: string): string => {
  const severityMap: Record<string, string> = {
    critical: 'high',
    serious: 'high',
    moderate: 'medium',
    minor: 'low',
  };
  return severityMap[impact?.toLowerCase()] || 'medium';
};

const createAnalysisPayload = (
  unified: ExtendedUnifiedResponse,
  stats: AnalysisStats,
  wcagVersion: string,
  wcagLevel: string,
  userId?: number
) => {
  const { axeStats = {}, eaStats = {} } = stats;

  return {
    userId: userId ?? 1, // Usa el userId del request o default 1
    dateAnalysis: new Date().toISOString(),
    contentType: unified.meta?.inputType === 'html' ? 'html' : 'url',
    contentInput:
      unified.meta?.inputType === 'html'
        ? unified.meta?.value?.substring(0, 1000) || 'html content'
        : unified.meta?.value || 'no-url',
    sourceUrl: unified.meta?.inputType === 'url' ? unified.meta?.value : 'N/A',
    toolUsed: unified.meta?.tool || 'axe',
    status: unified.ok ? 'completed' : 'failed',
    summaryResult: `Analysis completed with ${
      axeStats.violations || 0
    } violations, ${axeStats.needsReview || 0} needs review, ${
      axeStats.recommendations || 0
    } recommendations`,
    resultJson: JSON.stringify(unified, null, 2),
    durationMs: unified.meta?.duration || 0,
    wcagVersion: wcagVersion || '2.1',
    wcagLevel: wcagLevel || 'AA',
    // Estadísticas de axe-core
    axeViolations: axeStats.violations || 0,
    axeNeedsReview: axeStats.needsReview || 0,
    axeRecommendations: axeStats.recommendations || 0,
    axePasses: axeStats.passes || 0,
    axeIncomplete: axeStats.incomplete || 0,
    axeInapplicable: axeStats.inapplicable || 0,
    // Estadísticas de Equal Access
    eaViolations: eaStats.violations || 0,
    eaNeedsReview: eaStats.needsReview || 0,
    eaRecommendations: eaStats.recommendations || 0,
    eaPasses: eaStats.passes || 0,
    eaIncomplete: eaStats.incomplete || 0,
    eaInapplicable: eaStats.inapplicable || 0,
  };
};

// Helper para crear payload de errores
const createErrorPayload = (
  item: AnalysisItem,
  node: AnalysisNode,
  analysisId: string | number,
  errorMessage: string,
  resultId: number
) => {
  const wcagInfo = getWcagMapping(item);
  const criterionId = getWcagCriterionId(wcagInfo.criterion);

  // Asegurar que todos los campos tengan valores no vacíos para pasar las validaciones
  const safeErrorCode =
    (item.id || item.ruleId || 'unknown').trim() || 'unknown';
  const safeDescription =
    (item.help || item.message || errorMessage || 'Error description').trim() ||
    'Error description';
  const safeLocation =
    (node.target?.[0] ?? node.path?.dom ?? 'html').trim() || 'html';
  const safeMessage =
    (errorMessage || 'Error message').trim() || 'Error message';
  const safeCode =
    (node.html ?? node.snippet ?? item.id ?? 'html').trim() || 'html';

  // Payload exacto para ErrorCreateDto del microservicio .NET
  return {
    resultId: resultId, // int - ID del resultado en RESULTS
    wcagCriterionId: criterionId, // int - ID del criterio WCAG
    errorCode: safeErrorCode, // string - Código del error (ej: "document-title")
    description: safeDescription, // string - Descripción del error
    location: safeLocation, // string - Ubicación (ej: "html", "body")
    message: safeMessage, // string - Mensaje detallado del error
    code: safeCode, // string - Código HTML o identificador
  };
};

// Helpers para guardar resultados y errores
async function saveAnalysis(
  analysisPayload: AnalysisPayload,
  req: express.Request,
  requestId: string
) {
  const logger = createOptimizedLogger(requestId, req);

  logger.info('saveAnalysis called', { ANALYSIS_API_URL });

  // Si no hay URL configurada, no intentar guardar
  if (!ANALYSIS_API_URL) {
    logger.warn('ANALYSIS_API_URL not configured, skipping save');
    return null;
  }

  try {
    logger.debug('Sending payload to microservice', {
      payloadSize: JSON.stringify(analysisPayload).length,
    });

    const saveResp = await httpClient.post(
      `${ANALYSIS_API_URL}/api/analysis`,
      analysisPayload,
      { 'Accept-Language': req.headers['accept-language'] || 'es' }
    );

    logger.info('Response from microservice', {
      status: saveResp.status,
      ok: saveResp.ok,
    });

    if (!saveResp.ok) {
      const errorText = await saveResp.text();
      logger.error('Microservice returned error', {
        status: saveResp.status,
        error: errorText,
      });
      throw new Error(`Microservice error (${saveResp.status}): ${errorText}`);
    }

    const result = await saveResp.json();
    logger.info('Analysis saved successfully', { hasResult: !!result });
    return result;
  } catch (err) {
    const error = err as Error;
    logger.error('Network error to ms-analysis', { error: error.message });
    throw error;
  }
}

async function saveResult(
  result: Record<string, unknown>,
  requestId = 'unknown'
): Promise<number | null> {
  const logger = createOptimizedLogger(requestId);

  console.log('🚨 SAVE_RESULT_FUNCTION_START:', {
    resultKeys: Object.keys(result || {}),
    analysisApiUrl: ANALYSIS_API_URL,
    requestId,
  });

  if (!ANALYSIS_API_URL) {
    logger.warn('saveResult: No ANALYSIS_API_URL configured');
    console.log('🚨 SAVE_RESULT_NO_URL');
    return null;
  }

  logger.debug('saveResult called', {
    payloadSize: JSON.stringify(result).length,
  });

  try {
    console.log(
      '🚨 SAVE_RESULT_MAKING_REQUEST to:',
      `${ANALYSIS_API_URL}/api/result`
    );

    const resp = await httpClient.post(
      `${ANALYSIS_API_URL}/api/result`,
      result
    );

    console.log('🚨 SAVE_RESULT_RESPONSE:', {
      status: resp.status,
      ok: resp.ok,
    });

    logger.info('saveResult response', { status: resp.status, ok: resp.ok });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.log('🚨 SAVE_RESULT_ERROR_RESPONSE:', {
        status: resp.status,
        error: errorText,
      });
      logger.error('saveResult error response', {
        status: resp.status,
        error: errorText,
      });
      throw new Error(`SaveResult error (${resp.status}): ${errorText}`);
    }

    const responseData = await resp.json();
    console.log('🚨 SAVE_RESULT_SUCCESS_DATA:', { responseData });
    logger.info('saveResult success', { hasData: !!responseData });

    // Retornar el ID del resultado guardado
    const resultId = responseData?.data?.id || responseData?.id || null;
    console.log('🚨 SAVE_RESULT_RETURNING:', {
      resultId,
      hasData: !!responseData?.data,
      hasDirectId: !!responseData?.id,
    });
    return resultId;
  } catch (err) {
    const error = err as Error;
    console.log('🚨 SAVE_RESULT_CATCH_ERROR:', { error: error.message });
    logger.error('Error al guardar resultado', { error: error.message });
    // No re-throw para permitir que el análisis continúe
    return null;
  }
}

async function saveError(
  errorPayload: ErrorPayload,
  requestId = 'unknown'
): Promise<void> {
  const logger = createOptimizedLogger(requestId);

  if (!ANALYSIS_API_URL) {
    logger.warn('saveError: No ANALYSIS_API_URL configured');
    return;
  }

  logger.info('🔥 saveError called', {
    payload: errorPayload,
    payloadSize: JSON.stringify(errorPayload).length,
    payloadJson: JSON.stringify(errorPayload, null, 2),
  });

  try {
    const errorResp = await httpClient.post(
      `${ANALYSIS_API_URL}/api/error`,
      errorPayload
    );

    logger.info('saveError response', {
      status: errorResp.status,
      ok: errorResp.ok,
    });

    if (!errorResp.ok) {
      const errorText = await errorResp.text();
      logger.error('saveError error response', {
        status: errorResp.status,
        error: errorText,
      });
      throw new Error(`SaveError error (${errorResp.status}): ${errorText}`);
    }

    const responseData = await errorResp.json();
    logger.info('saveError success', { hasData: !!responseData });
  } catch (err) {
    const error = err as Error;
    logger.error('Error al guardar error', { error: error.message });
    // No re-throw para permitir que el análisis continúe
  }
}

// Optimized results and errors saving with parallel processing
async function saveResultsAndErrors(
  resultsPayload: Record<string, unknown>[],
  itemsList: AnalysisItem[],
  analysisId: string | number,
  requestId = 'unknown'
) {
  const logger = createOptimizedLogger(requestId);
  const failedResults: Array<{
    result: Record<string, unknown>;
    error: string;
  }> = [];
  const failedErrors: Array<{ errorPayload: ErrorPayload; error: string }> = [];

  // DEBUG: Log inicial MUY específico
  console.log('🚨 SAVE_RESULTS_AND_ERRORS_START:', {
    resultCount: resultsPayload.length,
    itemsCount: itemsList.length,
    analysisId,
    requestId,
    firstItemType: itemsList[0]?.type,
    firstItemId: (itemsList[0] as AnalysisItem)?.id,
  });

  logger.info('🔧 Starting to save results and errors', {
    resultCount: resultsPayload.length,
    itemsCount: itemsList.length,
    analysisId,
    requestId,
  });

  logger.info('🔧 Starting to save results and errors', {
    resultCount: resultsPayload.length,
    analysisId,
  });

  // Procesar resultados en paralelo (pero limitado para no sobrecargar la API)
  const BATCH_SIZE = 5; // Procesar en lotes de 5

  for (let i = 0; i < resultsPayload.length; i += BATCH_SIZE) {
    const batch = resultsPayload.slice(i, i + BATCH_SIZE);
    const batchItems = itemsList.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (result, batchIndex) => {
      const item = batchItems[batchIndex];
      let resultId: number | null = null;

      console.log('🚨 ABOUT_TO_SAVE_RESULT:', {
        batchIndex,
        itemId: (item as AnalysisItem)?.id,
        itemType: item.type,
        resultSize: JSON.stringify(result).length,
      });

      // Guardar resultado y capturar el ID
      try {
        console.log(
          '🚨 CALLING_SAVE_RESULT for item:',
          (item as AnalysisItem)?.id
        );
        resultId = await saveResult(result, requestId);
        console.log('🚨 SAVE_RESULT_RETURNED:', {
          itemId: (item as AnalysisItem)?.id,
          resultId,
        });
        logger.info(`Result saved with ID: ${resultId}`, { requestId });
      } catch (err) {
        console.log('🚨 SAVE_RESULT_FAILED:', {
          itemId: (item as AnalysisItem)?.id,
          error: String(err),
        });
        failedResults.push({ result, error: String(err) });
        logger.error(`Failed to save result: ${err}`, { requestId });
      }

      // Procesar errores si aplica (solo si el resultado se guardó exitosamente)
      const errorTypes = ['violation', 'needsreview', 'recommendation'];

      console.log('🚨 ERROR_PROCESSING_CHECK:', {
        itemId: (item as AnalysisItem)?.id,
        itemType: item.type,
        resultId,
        errorTypes,
        typeIncluded: errorTypes.includes((item.type || '').toLowerCase()),
        hasResultId: !!resultId,
      });

      logger.info(
        `🔍 Checking error processing for item: ${
          (item as AnalysisItem)?.id || 'unknown'
        }, type: "${item.type}", resultId: ${resultId}`,
        { requestId }
      );

      if (resultId && errorTypes.includes((item.type || '').toLowerCase())) {
        const node = item.nodes?.[0] ?? {};
        const errorMessage = node.failureSummary || item.help || null;

        console.log('🚨 ERROR_CONDITIONS_MET:', {
          itemId: item.id,
          itemType: item.type,
          resultId,
          hasNodes: !!item.nodes?.length,
          hasFailureSummary: !!node.failureSummary,
          hasHelp: !!item.help,
          errorMessage: errorMessage ? 'EXISTS' : 'NULL',
          errorMessagePreview: errorMessage?.substring(0, 50),
        });

        logger.info(
          `Processing error for item ID: ${item.id}, type: ${
            item.type
          }, has failureSummary: ${!!node.failureSummary}, has help: ${!!item.help}`,
          { requestId }
        );

        if (errorMessage) {
          console.log('🚨 ABOUT_TO_SAVE_ERROR:', {
            itemId: item.id,
            resultId,
            errorMessageLength: errorMessage.length,
          });
          const errorPayload = createErrorPayload(
            item,
            node,
            (
              result as Record<string, unknown> & {
                analysisId: string | number;
              }
            ).analysisId,
            errorMessage,
            resultId // Usar el ID real del resultado guardado
          );
          logger.info(`Created error payload for resultId: ${resultId}`, {
            requestId,
          });

          console.log('🚨 CREATED_ERROR_PAYLOAD:', {
            itemId: item.id,
            resultId,
            hasErrorPayload: !!errorPayload,
            errorPayloadKeys: Object.keys(errorPayload || {}),
            payloadSize: JSON.stringify(errorPayload).length,
          });

          try {
            console.log('🚨 CALLING_SAVE_ERROR:', {
              itemId: item.id,
              resultId,
            });
            await saveError(errorPayload, requestId);
            console.log('🚨 SAVE_ERROR_COMPLETED:', {
              itemId: item.id,
              resultId,
            });
            logger.info(`Error saved successfully for resultId: ${resultId}`, {
              requestId,
            });
          } catch (err) {
            console.log('🚨 SAVE_ERROR_FAILED:', {
              itemId: item.id,
              resultId,
              error: String(err),
            });
            failedErrors.push({ errorPayload, error: String(err) });
            logger.error(`Failed to save error: ${err}`, { requestId });
          }
        } else {
          console.log('🚨 NO_ERROR_MESSAGE:', {
            itemId: item.id,
            itemType: item.type,
            resultId,
            hasNodes: !!item.nodes?.length,
            nodeKeys: Object.keys(node),
            itemKeys: Object.keys(item).filter(key => key !== 'nodes'),
            failureSummary: node.failureSummary,
            help: item.help,
          });
          logger.warn(`No error message found for item ID: ${item.id}`, {
            requestId,
          });
        }
      } else if (resultId) {
        logger.info(
          `Skipping error processing for item ID: ${item.id}, type: ${item.type} (not a violation type)`,
          { requestId }
        );
      } else {
        logger.warn(
          `Skipping error processing because result was not saved for item ID: ${item.id}`,
          { requestId }
        );
      }
    });

    // Esperar a que termine el lote antes de continuar
    await Promise.all(batchPromises);
  }

  logger.info('Completed saving results and errors', {
    failedResults: failedResults.length,
    failedErrors: failedErrors.length,
  });

  return { failedResults, failedErrors };
}

/**
 * @openapi
 * /api/analyze:
 *   post:
 *     summary: Analiza accesibilidad web (HTML o URL)
 *     description: |
 *       **Análisis de Accesibilidad Web Completo**
 *
 *       Este endpoint ejecuta análisis de accesibilidad usando axe-core y/o IBM Equal Access,
 *       y automáticamente guarda los resultados en el microservicio de análisis.
 *
 *       ## 🔄 **Integración con Microservicio**
 *       - **Auto-Save** → Guarda análisis en `http://localhost:8082/api/analysis`
 *       - **Auto-Save** → Guarda resultados en `http://localhost:8082/api/result`
 *       - **Auto-Save** → Guarda errores en `http://localhost:8082/api/error`
 *       - **Response** → Devuelve `analysisId` para consultas futuras
 *
 *       ## 🎯 **URLs de Consulta Post-Análisis**
 *       Después del análisis, consulta los datos guardados:
 *       - **Por ID**: `http://localhost:8082/api/analysis/{analysisId}`
 *       - **Por fecha**: `http://localhost:8082/api/analysis/by-date?userId=1&date=2025-08-22`
 *       - **Swagger DB**: `http://localhost:8082/swagger/index.html`
 *     tags: [Analysis]
 *     parameters:
 *       - in: header
 *         name: Accept-Language
 *         schema:
 *           type: string
 *           example: es
 *         required: false
 *         description: Idioma preferido para mensajes (es, en)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyzeRequest'
 *           examples:
 *             axe-core-Equal Access-html-advanced:
 *               summary: "axe-core y Equal Access · HTML alta complejidad"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Avanzado</title>\n    <script>\n      document.addEventListener('DOMContentLoaded', () => {\n        const b = document.getElementById('abrir');\n        if (b) b.addEventListener('click', () => {\n          const d = document.getElementById('dlg');\n          if (d) d.removeAttribute('hidden');\n        });\n      });\n    </script>\n  </head>\n  <body>\n    <nav><a href=\"#main\">Ir al contenido</a></nav>\n    <main id=\"main\">\n      <h1>Catálogo</h1>\n      <div role=\"tablist\">\n        <button role=\"tab\" aria-selected=\"true\">Tab 1</button>\n        <button role=\"tab\">Tab 2</button>\n      </div>\n      <button id=\"abrir\">Abrir modal</button>\n      <div id=\"dlg\" role=\"dialog\" aria-modal=\"true\" hidden>\n        <h2>Título</h2>\n        <button>Cerrar</button>\n      </div>\n    </main>\n  </body>\n</html>\n"
 *                 tool: "both"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-basic:
 *               summary: "axe-core · HTML básico"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head><meta charset=\"utf-8\"><title>Hola</title></head>\n  <body>\n    <h1>Hola mundo</h1>\n    <p>Contenido de ejemplo.</p>\n  </body>\n</html>\n"
 *                 tool: "axe-core"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-medium:
 *               summary: "axe-core · HTML complejidad media (algunos problemas comunes)"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Ejemplo medio</title>\n    <style>.low-contrast{color:#999;background:#9a9a9a;}</style>\n  </head>\n  <body>\n    <img src=\"foto.jpg\">\n    <button></button>\n    <a href=\"#\">Leer más</a>\n    <p class=\"low-contrast\">Texto con bajo contraste.</p>\n    <form>\n      <label for=\"email\">Correo</label>\n      <input id=\"correo\" type=\"email\" placeholder=\"tu@correo.com\">\n      <button type=\"submit\">Enviar</button>\n    </form>\n  </body>\n</html>\n"
 *                 tool: "axe-core"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-advanced:
 *               summary: "axe-core · HTML alta complejidad (landmarks/ARIA)"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Avanzado</title>\n    <style>#menu{display:none;}</style>\n  </head>\n  <body>\n    <header role=\"banner\"><h1>Portal</h1></header>\n    <nav aria-label=\"principal\"><ul><li><a href=\"#m\">Menú</a></li></ul></nav>\n    <main id=\"m\" role=\"main\">\n      <section aria-labelledby=\"s1\"><h2 id=\"s1\">Productos</h2></section>\n      <button aria-haspopup=\"dialog\" aria-controls=\"dlg\">Abrir modal</button>\n      <div id=\"dlg\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"t\" hidden>\n        <h2 id=\"t\">Título modal</h2>\n        <button id=\"cerrar\">X</button>\n      </div>\n      <div role=\"button\">Acción</div>\n    </main>\n    <footer role=\"contentinfo\">© 2025</footer>\n  </body>\n</html>\n"
 *                 tool: "axe-core"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-aspx:
 *               summary: "axe-core · HTML con ASPX"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<%@ Page Language=\"C#\" AutoEventWireup=\"true\" %>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>ASPX Sample</title>\n  </head>\n  <body>\n    <form id=\"form1\" runat=\"server\">\n      <h1><%= \"Hola desde ASPX\" %></h1>\n      <img src=\"/img/logo.png\">\n      <asp:TextBox ID=\"txtEmail\" runat=\"server\" />\n      <asp:Button ID=\"btnSend\" runat=\"server\" Text=\"\" />\n      <a href=\"#\">Más info</a>\n    </form>\n  </body>\n</html>\n"
 *                 tool: "axe-core"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-php:
 *               summary: "axe-core · HTML con PHP"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title><?php echo \"PHP Sample\"; ?></title>\n  </head>\n  <body>\n    <h1><?php echo \"Hola desde PHP\"; ?></h1>\n    <img src=\"/img/banner.jpg\">\n    <button></button>\n    <label for=\"email\">Correo</label>\n    <input id=\"correo\" type=\"email\">\n  </body>\n</html>\n"
 *                 tool: "axe-core"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-react:
 *               summary: "axe-core · HTML con React"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>React Sample</title>\n    <script crossorigin src=\"https://unpkg.com/react@18/umd/react.development.js\"></script>\n    <script crossorigin src=\"https://unpkg.com/react-dom@18/umd/react-dom.development.js\"></script>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script>\n      const e = React.createElement;\n      function App() {\n        return e('div', null,\n          e('h1', null, 'Hola React'),\n          e('button', null),\n          e('img', { src: '/img/x.png' })\n        );\n      }\n      ReactDOM.createRoot(document.getElementById('root')).render(e(App));\n    </script>\n  </body>\n</html>\n"
 *                 tool: "axe-core"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-url:
 *               summary: "axe-core · URL pública"
 *               value:
 *                 inputType: "url"
 *                 value: "https://www.elcomercio.com/"
 *                 tool: "axe-core"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-basic:
 *               summary: "Equal Access · HTML básico"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head><meta charset=\"utf-8\"><title>Hola</title></head>\n  <body>\n    <h1>Hola mundo</h1>\n    <p>Contenido de ejemplo.</p>\n  </body>\n</html>\n"
 *                 tool: "equal-access"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-medium:
 *               summary: "Equal Access · HTML complejidad media"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Ejemplo medio</title>\n  </head>\n  <body>\n    <img src=\"foto.jpg\">\n    <button aria-label=\"\"></button>\n    <label>Nombre<input type=\"text\"></label>\n    <a href=\"#\" role=\"button\">Más</a>\n    <ul><li tabindex=\"0\">Item sin rol</li></ul>\n  </body>\n</html>\n"
 *                 tool: "equal-access"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-advanced:
 *               summary: "Equal Access · HTML alta complejidad"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Avanzado</title>\n    <script>\n      document.addEventListener('DOMContentLoaded', () => {\n        const b = document.getElementById('abrir');\n        if (b) b.addEventListener('click', () => {\n          const d = document.getElementById('dlg');\n          if (d) d.removeAttribute('hidden');\n        });\n      });\n    </script>\n  </head>\n  <body>\n    <nav><a href=\"#main\">Ir al contenido</a></nav>\n    <main id=\"main\">\n      <h1>Catálogo</h1>\n      <div role=\"tablist\">\n        <button role=\"tab\" aria-selected=\"true\">Tab 1</button>\n        <button role=\"tab\">Tab 2</button>\n      </div>\n      <button id=\"abrir\">Abrir modal</button>\n      <div id=\"dlg\" role=\"dialog\" aria-modal=\"true\" hidden>\n        <h2>Título</h2>\n        <button>Cerrar</button>\n      </div>\n    </main>\n  </body>\n</html>\n"
 *                 tool: "equal-access"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-aspx:
 *               summary: "Equal Access · HTML con ASPX"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<%@ Page Language=\"C#\" AutoEventWireup=\"true\" %>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title>ASPX Sample</title>\n    <style>.low-contrast{color:#9a9a9a;background:#9b9b9b;}</style>\n  </head>\n  <body>\n    <form id=\"form1\" runat=\"server\">\n      <h1>Portal</h1>\n      <p class=\"low-contrast\">Texto con bajo contraste</p>\n      <asp:CheckBox ID=\"chk\" runat=\"server\" />\n      <asp:LinkButton ID=\"lnk\" runat=\"server\">Click</asp:LinkButton>\n      <a role=\"button\">Acción</a>\n    </form>\n  </body>\n</html>\n"
 *                 tool: "equal-access"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-php:
 *               summary: "Equal Access · HTML con PHP"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title><?= \"PHP Sample\" ?></title>\n  </head>\n  <body>\n    <nav><a href=\"#contenido\">Ir</a></nav>\n    <main id=\"contenido\">\n      <h1>Categorías</h1>\n      <ul>\n        <li tabindex=\"0\">Item</li>\n        <li><a href=\"#\">Leer más</a></li>\n      </ul>\n      <?php if (true): ?>\n      <div role=\"dialog\" aria-modal=\"true\">\n        <h2>Modal</h2>\n        <button>Cerrar</button>\n      </div>\n      <?php endif; ?>\n    </main>\n  </body>\n</html>\n"
 *                 tool: "equal-access"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-react:
 *               summary: "Equal Access · HTML con React"
 *               value:
 *                 inputType: "html"
 *                 value: "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>React Sample</title>\n    <script crossorigin src=\"https://unpkg.com/react@18/umd/react.development.js\"></script>\n    <script crossorigin src=\"https://unpkg.com/react-dom@18/umd/react-dom.development.js\"></script>\n    <style>.bad{color:#aaa;background:#aaa;}</style>\n  </head>\n  <body>\n    <div id=\"app\"></div>\n    <script>\n      const e = React.createElement;\n      const App = () => e('main', { id:'main' },\n        e('h1', { className:'bad' }, 'Catálogo'),\n        e('a', { href:'#', role:'button' }, 'Abrir'),\n        e('input', { type:'text', placeholder:'Nombre' })\n      );\n      ReactDOM.createRoot(document.getElementById('app')).render(e(App));\n    </script>\n  </body>\n</html>\n"
 *                 tool: "equal-access"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-url:
 *               summary: "Equal Access · URL pública"
 *               value:
 *                 inputType: "url"
 *                 value: "https://www.elcomercio.com/"
 *                 tool: "equal-access"
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *     responses:
 *       200:
 *         description: |
 *           **✅ Análisis Completado y Guardado Exitosamente**
 *
 *           El análisis se ejecutó correctamente y se guardó en el microservicio de análisis.
 *           El resultado incluye el `analysisId` para consultas futuras.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnifiedResponse'
 *             examples:
 *               successful_analysis:
 *                 summary: "Análisis exitoso con guardado automático"
 *                 value:
 *                   ok: true
 *                   data:
 *                     ok: true
 *                     meta:
 *                       inputType: "html"
 *                       tool: "axe-core"
 *                       wcagVersion: "2.2"
 *                       wcagLevel: "AA"
 *                       duration: 1500
 *                     results:
 *                       - tool: "axe-core"
 *                         stats:
 *                           violations: 2
 *                           needsReview: 1
 *                           passes: 15
 *                         items: []
 *                     analysisSaved: true
 *                     analysisId: 42
 *                     message: "Análisis y resultados guardados exitosamente en la base de datos"
 *                   requestId: "abc123"
 *       207:
 *         description: |
 *           **⚠️ Análisis Completado con Problemas de Guardado Parcial**
 *
 *           El análisis se ejecutó correctamente, pero algunos resultados no se pudieron guardar.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnifiedResponse'
 *       400:
 *         description: "❌ Error de validación en los parámetros de entrada"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation_error:
 *                 summary: "Error de validación típico"
 *                 value:
 *                   ok: false
 *                   error: "inputType must be 'html' or 'url'"
 *                   code: "VALIDATION_ERROR"
 *                   requestId: "abc123"
 *       429:
 *         description: "🚫 Límite de velocidad excedido"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: "💥 Error interno del servidor"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: |
 *           **🔌 Microservicio de Análisis No Disponible**
 *
 *           El análisis se ejecutó correctamente, pero no se pudo conectar con el microservicio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       504:
 *         description: "⏱️ Timeout en el análisis"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
analyzeRouter.post('/', async (req: express.Request, res: express.Response) => {
  const requestId = (req as express.Request & { id?: string }).id;
  const logger = createOptimizedLogger(requestId, req);
  const config = getAnalysisConfig();

  // Validación y sanitización
  const validated = await validateAndSanitizeInput(
    req.body,
    requestId,
    (
      req as express.Request & {
        log?: { info: (data: LogData, message: string) => void };
      }
    )?.log
  );
  if ('error' in validated) {
    return res
      .status(400)
      .json(
        error(
          validated.error ?? 'Datos inválidos',
          'VALIDATION_ERROR',
          validated.details,
          requestId
        )
      );
  }

  const {
    inputType,
    value,
    tool,
    wcagVersion,
    wcagLevel,
    cumulativeWcag,
    userId,
  } = validated;

  try {
    logger.info('Starting analysis', {
      inputType,
      tool,
      wcagVersion,
      wcagLevel,
    });

    const { unified, wcagVersions, wcagLevels } = await runFullAnalysis({
      inputType,
      value,
      tool,
      wcagVersion,
      wcagLevel,
      cumulativeWcag,
      ...config,
      requestId,
      req,
    });

    const saveResults = await saveAndFormatResults({
      unified: unified as ExtendedUnifiedResponse,
      wcagVersions,
      wcagLevels,
      wcagVersion,
      wcagLevel,
      req,
      requestId,
      userId,
    });

    const { statusCode, message, analysisId, failedResults, failedErrors } =
      saveResults || {};

    logger.info('Analysis completed', { analysisId, statusCode });

    return res.status(statusCode || 200).json(
      success(
        {
          ...unified,
          analysisSaved: true,
          message,
          analysisId,
          failedResults,
          failedErrors,
        },
        requestId
      )
    );
  } catch (err: unknown) {
    const errorObj = err as Error;
    const msg = errorObj.message ?? '';
    const isTimeout = /timeout/i.test(msg);
    const status = isTimeout ? 504 : 500;

    logger.error('Analyze error', { error: msg, isTimeout });

    return res.status(status).json(
      error(
        isTimeout ? 'Analysis timed out' : msg,
        isTimeout ? 'TIMEOUT' : 'INTERNAL_ERROR',
        {
          details: (err as Record<string, unknown>)?.details,
          code: (err as Record<string, unknown>)?.code,
          stack:
            process.env.NODE_ENV !== 'production' ? errorObj.stack : undefined,
        },
        requestId
      )
    );
  }
});

function getCumulativeWcag(
  wcagVersion: WcagVersion,
  wcagLevel: WcagLevel,
  cumulativeWcag: boolean
) {
  let wcagVersions: Array<WcagVersion> = [wcagVersion];
  let wcagLevels: Array<WcagLevel> = [wcagLevel];
  if (cumulativeWcag) {
    const versionOrder: Array<WcagVersion> = ['2.2', '2.1', '2.0'];
    const levelOrder: Array<WcagLevel> = ['AAA', 'AA', 'A'];
    const vIdx = versionOrder.indexOf(wcagVersion);
    const lIdx = levelOrder.indexOf(wcagLevel);
    if (vIdx === -1) throw new Error(`Versión WCAG inválida: ${wcagVersion}`);
    if (lIdx === -1) throw new Error(`Nivel WCAG inválido: ${wcagLevel}`);
    wcagVersions = versionOrder.slice(vIdx);
    wcagLevels = levelOrder.slice(lIdx);
  }
  return { wcagVersions, wcagLevels };
}

async function runFullAnalysis({
  inputType,
  value,
  tool,
  wcagVersion,
  wcagLevel,
  cumulativeWcag,
  ANALYZE_TIMEOUT_MS,
  NAVIGATION_TIMEOUT_MS,
  WRAP_MARGIN_MS,
  requestId,
  req,
}: {
  inputType: string;
  value: string;
  tool: string;
  wcagVersion: WcagVersion;
  wcagLevel: WcagLevel;
  cumulativeWcag: boolean;
  ANALYZE_TIMEOUT_MS: number;
  NAVIGATION_TIMEOUT_MS: number;
  WRAP_MARGIN_MS: number;
  requestId: string;
  req: express.Request;
}) {
  const startTime = Date.now();
  const validatedUrl = await validateUrlIfNeeded(
    inputType as 'html' | 'url',
    value
  );
  if (validatedUrl !== undefined) value = validatedUrl;
  const parts = await runAnalysisTools({
    inputType: inputType as 'html' | 'url',
    value,
    tool: tool as 'axe-core' | 'equal-access' | 'both',
    wcagVersion,
    wcagLevel,
    ANALYZE_TIMEOUT_MS,
    NAVIGATION_TIMEOUT_MS,
    WRAP_MARGIN_MS,
  });
  if (parts.length === 0) {
    req.log?.warn({ requestId, tool }, 'No tool selected after validation');
    throw new Error('No se seleccionó ninguna herramienta válida');
  }
  const duration = Date.now() - startTime;
  const unified = buildUnified(parts, { inputType, value, tool, duration });
  if (!unified.ok) {
    throw new Error('Error en el análisis');
  }
  extractStats(unified);
  const { wcagVersions, wcagLevels } = getCumulativeWcag(
    wcagVersion,
    wcagLevel,
    cumulativeWcag
  );
  return { unified, wcagVersions, wcagLevels };
}

async function saveAndFormatResults({
  unified,
  wcagVersions,
  wcagLevels,
  wcagVersion,
  wcagLevel,
  req,
  requestId,
  userId,
}: {
  unified: ExtendedUnifiedResponse;
  wcagVersions: WcagVersion[];
  wcagLevels: WcagLevel[];
  wcagVersion: WcagVersion;
  wcagLevel: WcagLevel;
  req: express.Request;
  requestId: string;
  userId?: number;
}) {
  const logger = createOptimizedLogger(requestId, req);
  const stats = extractStats(unified) || { axeStats: {}, eaStats: {} };
  const analysisPayload = createAnalysisPayload(
    unified,
    stats,
    wcagVersion,
    wcagLevel,
    userId
  );

  let saveData;
  try {
    logger.info('Attempting to save analysis to microservice');
    saveData = await saveAnalysis(analysisPayload, req, requestId);
    logger.info('Save analysis completed', { hasData: !!saveData });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('Error saving analysis', { error: error.message });

    // Si ANALYSIS_API_URL no está configurada, continuar sin guardar
    if (!ANALYSIS_API_URL) {
      logger.warn('Continuing without saving due to missing ANALYSIS_API_URL');
      saveData = null;
    } else {
      // En lugar de retornar error, continuamos pero registramos el fallo
      logger.warn('Continuing without saving due to microservice error', {
        error: error.message,
      });
      saveData = null;
    }
  }

  // Debug logging optimizado - El DTO de C# usa "Id" con mayúscula
  const analysisId =
    saveData?.data?.Id ||
    saveData?.data?.id ||
    saveData?.Id ||
    saveData?.id ||
    null;
  logger.debug('Extracted analysisId', {
    analysisId,
    hasDataId: !!saveData?.data?.Id,
    hasDataid: !!saveData?.data?.id,
    hasId: !!saveData?.Id,
    hasid: !!saveData?.id,
  });

  // Escribir a archivo de depuración solo en desarrollo
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_FILE_LOGGING === 'true'
  ) {
    try {
      fs.writeFileSync(
        'debug_saveData.json',
        JSON.stringify(saveData, null, 2)
      );
      const debugInfo = `\n--- ${new Date().toISOString()} ---\nanalysisId: ${analysisId}\nsaveData exists: ${!!saveData}\n\n`;
      fs.appendFileSync('debug_log.txt', debugInfo);
    } catch (err) {
      logger.warn('Failed to write debug files', {
        error: (err as Error).message,
      });
    }
  }

  // Procesamiento de resultados con mapeo WCAG corregido
  const itemsList: AnalysisItem[] = [];

  // DEBUG: Log filtros WCAG
  logger.info('🔍 WCAG Filters:', {
    wcagVersions,
    wcagLevels,
    requestId,
  });

  const resultsPayload = unified.results.flatMap(toolResult =>
    toolResult.items
      .filter(item => {
        const wcagInfo = getWcagMapping(item as AnalysisItem);

        // DEBUG: Log cada item antes del filtro
        logger.info('🔍 Checking item:', {
          rule:
            (item as AnalysisItem).id ||
            (item as AnalysisItem).ruleId ||
            'unknown',
          wcagInfo,
          requestId,
        });

        // Filtrar por versiones y niveles WCAG solicitados
        // Si no hay información WCAG específica, usar valores por defecto inclusivos
        const versionMatch =
          wcagVersions.includes(wcagInfo.version) ||
          (wcagInfo.version === '2.0' &&
            wcagVersions.some((v: string) => ['2.1', '2.2'].includes(v)));
        const levelMatch =
          wcagLevels.includes(wcagInfo.level) ||
          (wcagInfo.level === 'A' &&
            wcagLevels.some((l: string) => ['AA', 'AAA'].includes(l)));

        const passes = versionMatch && levelMatch;

        // DEBUG: Log resultado del filtro
        logger.info('🔍 Filter result:', {
          rule:
            (item as AnalysisItem).id ||
            (item as AnalysisItem).ruleId ||
            'unknown',
          versionMatch,
          levelMatch,
          passes,
          requestId,
        });

        return passes;
      })
      .map(item => {
        itemsList.push(item as AnalysisItem);
        const wcagInfo = getWcagMapping(item as AnalysisItem);
        const criterionId = getWcagCriterionId(wcagInfo.criterion);

        return {
          analysisId,
          wcagCriterionId: criterionId,
          wcagCriterion: wcagInfo.criterion,
          level: item.type || 'violation',
          severity: mapImpactToSeverity(item.impact || 'minor'),
          description:
            item.help ||
            (item as AnalysisItem).message ||
            (item.nodes?.[0]?.failureSummary ?? 'Accessibility issue detected'),
        };
      })
  );

  // Debug logging antes de saveResultsAndErrors
  logger.info('📊 About to call saveResultsAndErrors', {
    resultsPayloadLength: resultsPayload.length,
    itemsListLength: itemsList.length,
    analysisId,
    hasAnalysisId: !!analysisId,
  });

  const { failedResults, failedErrors } = await saveResultsAndErrors(
    resultsPayload,
    itemsList,
    analysisId,
    requestId
  );

  // Formateo de respuesta optimizado
  const hasFailures = failedResults.length > 0 || failedErrors.length > 0;

  return {
    statusCode: hasFailures ? 207 : 200,
    message: hasFailures
      ? `Análisis guardado, pero algunos resultados (${failedResults.length}) o errores (${failedErrors.length}) no se pudieron guardar.`
      : 'Análisis y resultados guardados exitosamente en la base de datos',
    analysisId,
    failedResults: hasFailures
      ? failedResults.map(f => ({
          wcagCriterion: f.result.wcagCriterion,
          level: f.result.level,
          severity: f.result.severity,
          description: f.result.description,
          error: f.error,
        }))
      : undefined,
    failedErrors: hasFailures
      ? failedErrors.map(f => ({
          criterion: f.errorPayload.criterion,
          type: f.errorPayload.type,
          impact: f.errorPayload.impact,
          failureSummary: f.errorPayload.failureSummary,
          error: f.error,
        }))
      : undefined,
  };
}

export default analyzeRouter;
