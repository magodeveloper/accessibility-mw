import { AnalyzeRequestSchema } from '../schemas/analyze.schema';
import { runAxeOnPage } from '../services/axe.service';
import { runEqualAccess } from '../services/equalAccess.service';
import { withPage } from '../services/render.service';
import { validatePublicHttpUrl } from '../utils/security';
import { abortAfter } from '../utils/timing';

import {
  buildUnifiedResponse,
  EqualAccessReport,
  mapAxeToUnified,
  mapEqualAccessToUnified,
  UnifiedResponse,
} from '../mappers/unifyResults';

// Tipos auxiliares
export type ToolResult =
  | ReturnType<typeof mapAxeToUnified>
  | ReturnType<typeof mapEqualAccessToUnified>;
export type Stats = {
  violations?: number;
  needsReview?: number;
  recommendations?: number;
  passes?: number;
  incomplete?: number;
  inapplicable?: number;
};

interface Logger {
  warn?: (data: Record<string, unknown>, message: string) => void;
}

interface AnalysisToolsParams {
  inputType: 'html' | 'url';
  value: string;
  tool: 'axe-core' | 'equal-access' | 'both';
  wcagVersion: '2.0' | '2.1' | '2.2';
  wcagLevel: 'A' | 'AA' | 'AAA';
  ANALYZE_TIMEOUT_MS: number;
  NAVIGATION_TIMEOUT_MS: number;
  WRAP_MARGIN_MS: number;
}

interface PartialUnifiedResponse {
  meta: Record<string, unknown>;
  results: Array<{
    tool: string;
    stats?: Stats;
    [key: string]: unknown;
  }>;
}

interface AcceptLanguageHeader {
  'accept-language'?: string;
  [key: string]: string | undefined;
}

export async function validateAndSanitizeInput(
  body: unknown,
  requestId: string,
  log?: Logger
) {
  // Pre-validation security checks
  if (!body || typeof body !== 'object') {
    const error = 'Request body must be a valid JSON object';
    log?.warn?.({ requestId, error }, 'Invalid request body type');
    return { error, details: { formErrors: [error], fieldErrors: {} } };
  }

  // Check for oversized payloads
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > 10000) {
    // 10KB limit
    const error = 'Request body too large';
    log?.warn?.(
      { requestId, error, size: bodyStr.length },
      'Oversized request body'
    );
    return { error, details: { formErrors: [error], fieldErrors: {} } };
  }

  // Sanitize input strings to prevent injection attacks
  const sanitizeString = (str: unknown): string => {
    if (typeof str !== 'string') {
      const stringValue = str ?? '';
      return typeof stringValue === 'string'
        ? stringValue
        : JSON.stringify(stringValue);
    }
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 2000); // Limit length
  };

  // Apply sanitization if needed
  const bodyObj = body as Record<string, unknown>;
  if (bodyObj.value && typeof bodyObj.value === 'string') {
    if (bodyObj.inputType === 'url') {
      // URLs need special handling - just trim and limit length
      bodyObj.value = bodyObj.value.trim().slice(0, 2000);
    } else {
      // HTML content needs sanitization
      bodyObj.value = sanitizeString(bodyObj.value);
    }
  }

  const parse = AnalyzeRequestSchema.safeParse(bodyObj);
  if (!parse.success) {
    const message =
      parse.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ') || 'Datos inválidos';
    const details = {
      formErrors: [message],
      fieldErrors: parse.error.issues.reduce((acc, issue) => {
        const path = issue.path.join('.');
        if (!acc[path]) acc[path] = [];
        acc[path].push(issue.message);
        return acc;
      }, {} as Record<string, string[]>),
    };
    log?.warn?.(
      { requestId, message, details, inputSize: bodyStr.length },
      'Analyze blocked by schema'
    );
    return { error: message, details };
  }
  let { inputType, value, tool, wcagVersion, wcagLevel, cumulativeWcag } =
    parse.data;
  if (typeof value === 'string') value = value.trim();
  return { inputType, value, tool, wcagVersion, wcagLevel, cumulativeWcag };
}

export async function validateUrlIfNeeded(inputType: string, value: string) {
  if (inputType === 'url') {
    await validatePublicHttpUrl(value, {
      fetchBody: false,
      requireHtmlContentType: false,
      throwOnError: true,
    });
    return value;
  }
  return undefined;
}

export async function runAnalysisTools(params: AnalysisToolsParams) {
  const {
    inputType,
    value,
    tool,
    wcagVersion,
    wcagLevel,
    ANALYZE_TIMEOUT_MS,
    NAVIGATION_TIMEOUT_MS,
    WRAP_MARGIN_MS,
  } = params;
  const parts: ToolResult[] = [];
  if (tool === 'axe-core' || tool === 'both') {
    const axeRaw = await abortAfter(
      ANALYZE_TIMEOUT_MS + WRAP_MARGIN_MS,
      withPage(inputType, value, async page => runAxeOnPage(page), {
        overallTimeoutMs: ANALYZE_TIMEOUT_MS,
        navTimeoutMs: NAVIGATION_TIMEOUT_MS,
      }),
      { tool: 'axe-core', phase: 'withPage/axe' }
    );
    parts.push(mapAxeToUnified(axeRaw, wcagVersion, wcagLevel));
  }
  if (tool === 'equal-access' || tool === 'both') {
    const eaReport = await abortAfter(
      ANALYZE_TIMEOUT_MS + WRAP_MARGIN_MS,
      withPage(
        inputType,
        value,
        async page => runEqualAccess(page, `scan-${Date.now()}`),
        {
          overallTimeoutMs: ANALYZE_TIMEOUT_MS,
          navTimeoutMs: NAVIGATION_TIMEOUT_MS,
        }
      ),
      { tool: 'equal-access', phase: 'withPage/equal-access' }
    );
    parts.push(
      mapEqualAccessToUnified(
        eaReport as unknown as EqualAccessReport,
        wcagVersion,
        wcagLevel
      )
    );
  }
  return parts;
}

export function buildUnified(
  parts: ToolResult[],
  inputData?: {
    inputType: string;
    value: string;
    tool: string;
    duration?: number;
  }
): UnifiedResponse & {
  meta: UnifiedResponse['meta'] & Record<string, unknown>;
} {
  const unified = buildUnifiedResponse(parts);

  // Preserve original input data for microservice integration
  if (inputData) {
    // Add original input data to meta
    (unified.meta as Record<string, unknown>).inputType = inputData.inputType;
    (unified.meta as Record<string, unknown>).value = inputData.value;
    (unified.meta as Record<string, unknown>).tool = inputData.tool;
    (unified.meta as Record<string, unknown>).duration =
      inputData.duration || 0;
  }

  return unified as UnifiedResponse & {
    meta: UnifiedResponse['meta'] & Record<string, unknown>;
  };
}

export function extractStats(unified: PartialUnifiedResponse) {
  const axeStats: Stats =
    unified.results.find(
      (r: { tool: string; stats?: Stats }) => r.tool === 'axe-core'
    )?.stats ?? {};
  const eaStats: Stats =
    unified.results.find(
      (r: { tool: string; stats?: Stats }) => r.tool === 'equal-access'
    )?.stats ?? {};
  return { axeStats, eaStats };
}

export function getPreferredLang(header: AcceptLanguageHeader) {
  return (header['accept-language'] || 'es')
    .toString()
    .split(',')[0]
    .split('-')[0];
}

export function mapImpactToSeverity(impact: string): string {
  switch ((impact || '').toLowerCase()) {
    case 'critical':
      return 'high';
    case 'serious':
      return 'high';
    case 'moderate':
      return 'medium';
    case 'minor':
      return 'low';
    default:
      return 'medium';
  }
}

export function getWcagCumulative(
  wcagVersion: string,
  wcagLevel: string,
  cumulativeWcag: boolean
) {
  type WcagVersion = '2.0' | '2.1' | '2.2';
  type WcagLevel = 'A' | 'AA' | 'AAA';
  let wcagVersions: WcagVersion[] = [wcagVersion as WcagVersion];
  let wcagLevels: WcagLevel[] = [wcagLevel as WcagLevel];
  if (cumulativeWcag) {
    const versionOrder: WcagVersion[] = ['2.2', '2.1', '2.0'];
    const levelOrder: WcagLevel[] = ['AAA', 'AA', 'A'];
    const vIdx = versionOrder.indexOf(wcagVersion as WcagVersion);
    const lIdx = levelOrder.indexOf(wcagLevel as WcagLevel);
    wcagVersions = versionOrder.slice(vIdx);
    wcagLevels = levelOrder.slice(lIdx);
  }
  return { wcagVersions, wcagLevels };
}
