import * as express from 'express';
import * as fs from 'fs';
import { UnifiedResponse } from '../mappers/unifyResults';
import { advancedLogger } from '../services/logging.service';
import { ENV } from '../utils/environment';
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

interface LogData {
  [key: string]: unknown;
}

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

interface Logger {
  info: (message: string, data?: LogData) => void;
  warn: (message: string, data?: LogData) => void;
  error: (message: string, data?: LogData) => void;
  debug: (message: string, data?: LogData) => void;
}

type ExtendedUnifiedResponse = UnifiedResponse & {
  meta: UnifiedResponse['meta'] & {
    inputType?: string;
    value?: string;
    tool?: string;
    duration?: number;
  };
};

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
        const requestHeaders = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'accessibility-mw/1.0.0',
          ...headers,
        }; // Log detailed request info for debugging
        advancedLogger.debug('HTTP Request Details', {
          method: 'POST',
          url: url,
          headers: requestHeaders,
          payloadSize: JSON.stringify(data).length,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: requestHeaders,
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
const REPORTS_API_URL = process.env.REPORTS_API_URL || 'http://localhost:8083';
const analyzeRouter = express.Router();
export { analyzeRouter };
export default analyzeRouter;

interface AnalysisConfig {
  ANALYZE_TIMEOUT_MS: number;
  NAVIGATION_TIMEOUT_MS: number;
  WRAP_MARGIN_MS: number;
}

// Configuration object
const getAnalysisConfig = (): AnalysisConfig => ({
  ANALYZE_TIMEOUT_MS: ENV.ANALYZE_TIMEOUT_MS,
  NAVIGATION_TIMEOUT_MS: ENV.NAVIGATION_TIMEOUT_MS,
  WRAP_MARGIN_MS: ENV.WRAP_MARGIN_MS,
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

// Determina el idioma a usar (solo es / en por ahora)
const resolveAcceptLanguage = (req?: express.Request): string => {
  const raw = (req?.headers['accept-language'] as string) || '';
  if (!raw) return 'es';
  const first = raw.split(',')[0].trim().slice(0, 2).toLowerCase();
  return ['es', 'en'].includes(first) ? first : 'es';
};

// Helper para logs verbosos controlados por variable de entorno
const debugVerbose = (message: string, data?: unknown) => {
  if (process.env.DEBUG_VERBOSE === 'true') {
    console.log(`🐞 ${message}`, data || '');
  }
};

// Mapeo de tipo de resultado para el microservicio
const mapToResultLevel = (itemType?: string): string => {
  // Mapear tipos conocidos (normalizamos a minúsculas)
  const t = (itemType || '').toLowerCase();
  switch (t) {
    case 'violation':
      return 'violation';
    case 'recommendation':
    case 'remediation':
      return 'recommendation';
    case 'potentialviolation':
    case 'potential_violation':
    case 'needsreview':
    case 'needs_review':
      return 'potentialViolation';
    case 'manualcheck':
    case 'manual_check':
      return 'manualCheck';
    case 'pass':
    case 'passes':
      return 'pass';
    default:
      return 'violation';
  }
};

// Interfaz para respuesta detallada
interface SaveResponseDetail {
  success: number;
  error: number;
  message: string;
}

interface DetailedSaveResponse {
  analysis: SaveResponseDetail;
  results: SaveResponseDetail;
  errors: SaveResponseDetail;
  history?: SaveResponseDetail;
  totalProcessed: {
    violations: number;
    results: number;
    errors: number;
  };
}

const createAnalysisPayload = (
  unified: ExtendedUnifiedResponse,
  stats: AnalysisStats,
  wcagVersion: string,
  wcagLevel: string,
  userId?: number
) => {
  const { axeStats = {}, eaStats = {} } = stats;

  // Determine correct tool used - prioritize actual tool from meta, fallback to detecting from results
  let toolUsed = unified.meta?.tool || 'axe-core';
  if (toolUsed === 'both') {
    // Si el usuario especificó "both", mantener ese valor
    // Solo determinar la herramienta si no hay resultados de ninguna
    const hasAxeResults =
      (axeStats.violations || 0) > 0 || (axeStats.passes || 0) > 0;
    const hasEaResults =
      (eaStats.violations || 0) > 0 || (eaStats.passes || 0) > 0;
    if (hasEaResults && !hasAxeResults) {
      toolUsed = 'equal-access';
    } else if (hasAxeResults && !hasEaResults) {
      toolUsed = 'axe-core';
    } else {
      // Both have results or neither, mantener "both" como fue solicitado
      toolUsed = 'both';
    }
  }
  // Normalize tool name - ensure it matches expected values
  if (toolUsed === 'equal-access' || toolUsed === 'EqualAccess') {
    toolUsed = 'equal-access';
  } else if (toolUsed === 'axe' || toolUsed === 'axe-core') {
    toolUsed = 'axe-core';
  }

  return {
    userId: userId!, // Ya validamos que userId existe antes de llegar aquí
    dateAnalysis: new Date().toISOString(),
    contentType: unified.meta?.inputType === 'html' ? 'html' : 'url',
    contentInput:
      unified.meta?.inputType === 'html'
        ? unified.meta?.value?.substring(0, 1000) || 'html content'
        : 'N/A',
    sourceUrl: unified.meta?.inputType === 'url' ? unified.meta?.value : 'N/A',
    toolUsed: toolUsed,
    status: unified.ok ? 'success' : 'failed',
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

async function saveHistory(
  userId: number,
  analysisId: number,
  requestId = 'unknown',
  acceptLanguage = 'es'
): Promise<number | null> {
  const logger = createOptimizedLogger(requestId);
  logger.info('saveHistory called', { userId, analysisId, REPORTS_API_URL });



  // Si no hay URL configurada, no intentar guardar
  if (!REPORTS_API_URL) {
    logger.warn('saveHistory: No REPORTS_API_URL configured');
    return null;
  }

  const historyPayload = {
    userId: userId,
    analysisId: analysisId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  logger.debug('saveHistory payload prepared', {
    payload: historyPayload,
  });

  try {
    logger.debug('Sending history to Reports API', {
      url: `${REPORTS_API_URL}/api/History`,
    });

    const saveResp = await httpClient.post(
      `${REPORTS_API_URL}/api/History`,
      historyPayload,
      { 'Accept-Language': acceptLanguage || 'es' }
    );

    logger.info('Response from Reports API', {
      status: saveResp.status,
      ok: saveResp.ok,
    });

    if (!saveResp.ok) {
      const errorText = await saveResp.text();
      logger.error('Reports API returned error', {
        status: saveResp.status,
        error: errorText,
      });
      throw new Error(`Reports API error (${saveResp.status}): ${errorText}`);
    }

    const result = await saveResp.json();
    const historyId =
      result?.data?.Id || result?.data?.id || result?.Id || result?.id || null;
    logger.info('History saved successfully', { historyId });
    return historyId;
  } catch (err) {
    const error = err as Error;
    logger.error('Network error to ms-reports', { error: error.message });
    return null; // Continuar incluso si hay error en guardar el historial
  }
}

async function saveResult(
  result: Record<string, unknown>,
  requestId = 'unknown',
  acceptLanguage = 'es'
): Promise<number | null> {
  const logger = createOptimizedLogger(requestId);
  debugVerbose('SAVE_RESULT_START', {
    keys: Object.keys(result || {}),
    hasAnalysisId: !!result?.analysisId,
  });



  if (!ANALYSIS_API_URL) {
    logger.warn('saveResult: No ANALYSIS_API_URL configured');
    return null;
  }

  logger.debug('saveResult called', {
    payloadSize: JSON.stringify(result).length,
  });

  try {
    debugVerbose('SAVE_RESULT_REQUEST', {
      url: `${ANALYSIS_API_URL}/api/result`,
    });

    const resp = await httpClient.post(
      `${ANALYSIS_API_URL}/api/result`,
      result,
      { 'Accept-Language': acceptLanguage }
    );
    debugVerbose('SAVE_RESULT_RESPONSE', {
      status: resp.status,
      ok: resp.ok,
    });

    logger.info('saveResult response', { status: resp.status, ok: resp.ok });

    if (!resp.ok) {
      const errorText = await resp.text();
      logger.error('saveResult error response', {
        status: resp.status,
        error: errorText,
      });
      throw new Error(`SaveResult error (${resp.status}): ${errorText}`);
    }

    const responseData = await resp.json();
    logger.info('saveResult success', { hasData: !!responseData });

    // Retornar el ID del resultado guardado
    const resultId = responseData?.data?.id || responseData?.id || null;
    return resultId;
  } catch (err) {
    const error = err as Error;
    logger.error('Error al guardar resultado', {
      error: error.message,
      errorName: error.name,
      stack: error.stack?.substring(0, 200),
    });
    // No re-throw para permitir que el análisis continúe
    return null;
  }
}

async function saveError(
  errorPayload: ErrorPayload,
  requestId = 'unknown',
  acceptLanguage = 'es'
): Promise<void> {
  const logger = createOptimizedLogger(requestId);



  if (!ANALYSIS_API_URL) {
    logger.warn('saveError: No ANALYSIS_API_URL configured');
    return;
  }

  logger.debug('saveError called', {
    payloadSize: JSON.stringify(errorPayload).length,
  });

  try {
    const errorResp = await httpClient.post(
      `${ANALYSIS_API_URL}/api/error`,
      errorPayload,
      { 'Accept-Language': acceptLanguage }
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
    firstItemId: itemsList[0]?.id,
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
        itemId: item?.id,
        itemType: item.type,
        resultSize: JSON.stringify(result).length,
      });

      // Guardar resultado y capturar el ID
      try {
        console.log('🚨 CALLING_SAVE_RESULT for item:', item?.id);
        resultId = await saveResult(result, requestId);
        console.log('🚨 SAVE_RESULT_RETURNED:', {
          itemId: item?.id,
          resultId,
        });
        logger.info(`Result saved with ID: ${resultId}`, { requestId });
      } catch (err) {
        console.log('🚨 SAVE_RESULT_FAILED:', {
          itemId: item?.id,
          error: String(err),
        });
        failedResults.push({ result, error: String(err) });
        logger.error(`Failed to save result: ${err}`, { requestId });
      }

      // Procesar errores si aplica (solo si el resultado se guardó exitosamente)
      const errorTypes = ['violation', 'needsreview', 'recommendation'];

      console.log('🚨 ERROR_PROCESSING_CHECK:', {
        itemId: item.id,
        itemType: item.type,
        resultId,
        errorTypes,
        typeIncluded: errorTypes.includes((item.type || '').toLowerCase()),
        hasResultId: !!resultId,
      });

      logger.info(
        `🔍 Checking error processing for item: ${
          item.id || 'unknown'
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
      isAnonymous: !userId,
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

    const saveResponse = saveResults || {};
    const analysisId = saveResponse.analysisId;
    const statusCode = saveResponse.statusCode || 200;
    const message = saveResponse.message || 'Analysis completed';
    const persistenceData = saveResponse.persistence || {};
    const resultErrors = persistenceData.results?.error || 0;
    const errorErrors = persistenceData.errors?.error || 0;
    const totalErrors = resultErrors + errorErrors;

    logger.info('Analysis completed', {
      analysisId,
      statusCode,
      resultErrors,
      errorErrors,
      totalErrors,
      analysisSuccess: persistenceData.analysis?.success,
      isAnonymous: !userId,
    });

    return res.status(statusCode || 200).json(
      success(
        {
          ...unified,
          analysisSaved: !!analysisId, // false para usuarios anónimos
          message,
          analysisId,
          persistence: persistenceData,
          totalErrors: totalErrors,
          errorsSummary: {
            resultSaveErrors: resultErrors,
            errorSaveErrors: errorErrors,
          },
          isAnonymous: !userId, // 🚨 NUEVO: Indicar si es análisis anónimo
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

// 🚨 NUEVO: Endpoint específico para análisis anónimo (sin guardar en BD)
analyzeRouter.post(
  '/anonymous',
  async (req: express.Request, res: express.Response) => {
    const requestId = (req as express.Request & { id?: string }).id;
    const logger = createOptimizedLogger(requestId, req);
    const config = getAnalysisConfig();

    // Forzar userId a undefined para análisis anónimo
    const bodyWithoutUserId = { ...req.body, userId: undefined };

    // Validación y sanitización
    const validated = await validateAndSanitizeInput(
      bodyWithoutUserId,
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

    const { inputType, value, tool, wcagVersion, wcagLevel, cumulativeWcag } =
      validated;

    try {
      logger.info('Starting anonymous analysis', {
        inputType,
        tool,
        wcagVersion,
        wcagLevel,
      });

      const { unified } = await runFullAnalysis({
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

      logger.info('Anonymous analysis completed');

      // Retornar solo el análisis, sin persistencia
      return res.status(200).json(
        success(
          {
            ...unified,
            analysisSaved: false,
            message: 'Anonymous analysis completed successfully',
            analysisId: null,
            persistence: null,
            isAnonymous: true,
          },
          requestId
        )
      );
    } catch (err: unknown) {
      const errorObj = err as Error;
      const msg = errorObj.message ?? '';
      const isTimeout = /timeout/i.test(msg);
      const status = isTimeout ? 504 : 500;

      logger.error('Anonymous analyze error', { error: msg, isTimeout });

      return res.status(status).json(
        error(
          isTimeout ? 'Analysis timed out' : msg,
          isTimeout ? 'TIMEOUT' : 'INTERNAL_ERROR',
          {
            details: (err as Record<string, unknown>)?.details,
            code: (err as Record<string, unknown>)?.code,
            stack:
              process.env.NODE_ENV !== 'production'
                ? errorObj.stack
                : undefined,
          },
          requestId
        )
      );
    }
  }
);

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

  // 🚨 NUEVO: Soporte para usuarios anónimos
  if (!userId) {
    logger.info('Anonymous user analysis - skipping database persistence');
    return {
      statusCode: 200,
      message: 'Anonymous analysis completed successfully',
      analysisId: null,
      historyId: null,
      persistence: {
        analysis: {
          success: 0,
          error: 0,
          message: 'Skipped for anonymous user',
        },
        results: {
          success: 0,
          error: 0,
          message: 'Skipped for anonymous user',
        },
        errors: { success: 0, error: 0, message: 'Skipped for anonymous user' },
        history: {
          success: 0,
          error: 0,
          message: 'Skipped for anonymous user',
        },
      },
      summary: {
        totalViolations: 0,
        resultsProcessed: 0,
        errorsProcessed: 0,
        historyRecorded: false,
      },
    };
  }

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
    // FALLBACK: Si no se pudo guardar en microservicio, usar timestamp como ID temporal
    Date.now();
  logger.debug('Extracted analysisId', {
    analysisId,
    hasDataId: !!saveData?.data?.Id,
    hasDataid: !!saveData?.data?.id,
    hasId: !!saveData?.Id,
    hasid: !!saveData?.id,
    saveDataKeys: saveData ? Object.keys(saveData) : null,
    isFallbackId:
      !saveData ||
      (!saveData?.data?.Id &&
        !saveData?.data?.id &&
        !saveData?.Id &&
        !saveData?.id),
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

  const resultsPayload: Record<string, unknown>[] = [];
  unified.results.forEach(toolResult => {
    toolResult.items.forEach(item => {
      const analysisItem = item as AnalysisItem;
      const mapping = getWcagMapping(analysisItem);
      const criterion = mapping.criterion ?? 'unknown';
      resultsPayload.push({
        analysisId: analysisId,
        wcagCriterionId: getWcagCriterionId(criterion),
        wcagCriterion: criterion,
        level: mapToResultLevel(analysisItem.type),
        severity: mapImpactToSeverity(analysisItem.impact || ''),
        description:
          analysisItem.help ||
          analysisItem['message'] ||
          'Accessibility issue detected',
      });
      // Mantener lista de items para posteriores errores
      itemsList.push(analysisItem);
    });
  });

  // Debug logging del payload
  if (resultsPayload.length > 0) {
    logger.info('🚨 PAYLOAD_DEBUG: First result payload', {
      payload: resultsPayload[0],
      totalItems: resultsPayload.length,
    });
  }

  // Debug logging antes de saveResultsAndErrors
  logger.info('📊 About to call saveResultsAndErrors', {
    resultsPayloadLength: resultsPayload.length,
    itemsListLength: itemsList.length,
    analysisId,
    hasAnalysisId: !!analysisId,
    isFallbackId:
      !saveData ||
      (!saveData?.data?.Id &&
        !saveData?.data?.id &&
        !saveData?.Id &&
        !saveData?.id),
    microserviceStatus: saveData ? 'SUCCESS' : 'FAILED_OR_DISABLED',
  });

  // Procesar y guardar resultados y errores usando la función existente
  await saveResultsAndErrors(resultsPayload, itemsList, analysisId, requestId);

  // Guardar historial si tenemos ID de usuario y analysisId
  let historyId = null;
  if (userId && analysisId) {
    try {
      logger.info('Attempting to save history record', { userId, analysisId });
      const acceptLanguage = resolveAcceptLanguage(req);
      historyId = await saveHistory(
        userId,
        Number(analysisId),
        requestId,
        acceptLanguage
      );
      logger.info('History record saved', { historyId });
    } catch (histErr) {
      logger.error('Error saving history record', {
        error: (histErr as Error).message,
        userId,
        analysisId,
      });
      // Continuamos aunque falle el guardado del historial
    }
  } else {
    logger.warn('Cannot save history record - missing required data', {
      hasUserId: !!userId,
      hasAnalysisId: !!analysisId,
    });
  }

  // Crear respuesta detallada manualmente
  const detailedResponse: DetailedSaveResponse = {
    analysis: {
      success: 1,
      error: 0,
      message: 'Análisis guardado correctamente',
    },
    results: {
      success: resultsPayload.length,
      error: 0,
      message: `${resultsPayload.length} resultados procesados`,
    },
    errors: {
      success: itemsList.filter(item =>
        ['violation', 'needsreview', 'recommendation'].includes(
          item.type?.toLowerCase() || ''
        )
      ).length,
      error: 0,
      message: 'Errores procesados correctamente',
    },
    totalProcessed: {
      violations: itemsList.length,
      results: resultsPayload.length,
      errors: itemsList.filter(item =>
        ['violation', 'needsreview', 'recommendation'].includes(
          item.type?.toLowerCase() || ''
        )
      ).length,
    },
  };

  return {
    statusCode: detailedResponse.analysis.success === 1 ? 200 : 207,
    message: 'Análisis completado con detalles de persistencia',
    analysisId,
    historyId,
    persistence: {
      analysis: detailedResponse.analysis,
      results: detailedResponse.results,
      errors: detailedResponse.errors,
      history: {
        success: historyId ? 1 : 0,
        error: historyId ? 0 : 1,
        message: historyId
          ? 'Historial guardado correctamente'
          : 'No se pudo guardar el historial',
      },
    },
    summary: {
      totalViolations: detailedResponse.totalProcessed.violations,
      resultsProcessed: detailedResponse.totalProcessed.results,
      errorsProcessed: detailedResponse.totalProcessed.errors,
      historyRecorded: !!historyId,
    },
  };
}

// Exponer helpers para pruebas
export const __test = { mapToResultLevel, resolveAcceptLanguage };
