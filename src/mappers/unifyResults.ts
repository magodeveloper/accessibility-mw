// Interfaces para Axe-core
interface AxeNode {
  target?: string[];
  html?: string;
  failureSummary?: string;
  impact?: string;
}

interface AxeRule {
  id: string;
  help?: string;
  helpUrl?: string;
  impact?: string;
  nodes?: AxeNode[];
}

interface AxeResult {
  violations?: AxeRule[];
  passes?: AxeRule[];
  incomplete?: AxeRule[];
  inapplicable?: AxeRule[];
}

// Interfaces para Equal Access
interface EqualAccessResult {
  ruleId: string;
  level?: string;
  message?: string;
  snippet?: string;
  path?: {
    aria?: string;
  };
  value?: string[];
}

interface EqualAccessCounts {
  violation?: number;
  potentialviolation?: number;
  potentialrecommendation?: number;
  manual?: number;
  recommendation?: number;
  pass?: number;
}

export interface EqualAccessReport {
  summary?: {
    counts?: EqualAccessCounts;
  };
  results?: EqualAccessResult[];
}

type BaseItem = {
  id: string;
  tool: 'axe-core' | 'equal-access';
  type:
    | 'violation'
    | 'needsReview'
    | 'recommendation'
    | 'pass'
    | 'inapplicable'
    | 'incomplete';
  impact?: string;
  help?: string;
  helpUrl?: string;
  nodes?: Array<{ target?: string[]; html?: string; failureSummary?: string }>;
  wcag?: {
    version: '2.0' | '2.1' | '2.2';
    level: 'A' | 'AA' | 'AAA';
    criterion?: string | null;
  };
};

export type UnifiedToolResult = {
  tool: 'axe-core' | 'equal-access';
  stats: {
    violations: number;
    needsReview: number;
    recommendations: number;
    passes: number;
    incomplete: number;
    inapplicable: number;
  };
  items: BaseItem[];
};

export type UnifiedResponse = {
  ok: boolean;
  meta: {
    ['axe-core']?: Omit<
      UnifiedToolResult['stats'],
      'needsReview' | 'recommendations'
    > & {
      needsReview?: number;
      recommendations?: number;
    };
    ['equal-access']?: UnifiedToolResult['stats'];
  };
  results: UnifiedToolResult[];
  total: number; // suma de violations + needsReview + recommendations
};

export function mapAxeToUnified(
  axe: AxeResult,
  wcagVersion: '2.0' | '2.1' | '2.2',
  wcagLevel: 'A' | 'AA' | 'AAA'
): UnifiedToolResult {
  const order = ['minor', 'moderate', 'serious', 'critical'] as const;
  const inferImpact = (nodes: AxeNode[]): string | undefined => {
    let idx = -1;
    for (const n of nodes ?? []) {
      const i = order.indexOf(
        String(n?.impact ?? '').toLowerCase() as
          | 'minor'
          | 'moderate'
          | 'serious'
          | 'critical'
      );
      if (i > idx) idx = i;
    }
    return idx >= 0 ? order[idx] : undefined;
  };

  const toItems = (arr: AxeRule[], type: BaseItem['type']) =>
    arr.map((r: AxeRule) => ({
      id: r.id,
      tool: 'axe-core' as const,
      type,
      impact: r.impact ?? inferImpact(r.nodes ?? []),
      help: r.help,
      helpUrl: r.helpUrl,
      nodes: (r.nodes ?? []).map((n: AxeNode) => ({
        target: n.target,
        html: n.html,
        failureSummary: n.failureSummary,
      })),
      wcag: { version: wcagVersion, level: wcagLevel, criterion: null },
    }));

  // Importante: omitimos los "pass" del listado, pero NO de las estadísticas
  const items = [
    ...toItems(axe.violations ?? [], 'violation'),
    // ...toItems(axe.passes ?? [], 'pass'), // omitido a propósito
    ...toItems(axe.incomplete ?? [], 'incomplete'),
    // ...toItems(axe.inapplicable ?? [], 'inapplicable'),
  ];

  const stats = {
    violations: (axe.violations ?? []).length,
    needsReview: 0, // axe no expone potenciales como tal
    recommendations: 0, // axe no expone recomendaciones
    passes: (axe.passes ?? []).length,
    incomplete: (axe.incomplete ?? []).length,
    inapplicable: (axe.inapplicable ?? []).length,
  };

  return { tool: 'axe-core', stats, items };
}

// Normaliza "impact" para Equal Access a partir de su "level"
// Nota: Equal Access no provee impact oficial (minor/moderate/serious/critical) como axe-core.
// Este mapeo es heurístico para unificar UI.
function mapImpactFromLevel(
  level: string | undefined
): 'minor' | 'moderate' | 'serious' | 'critical' | undefined {
  const l = String(level ?? '').toLowerCase();
  switch (l) {
    case 'violation':
      return 'serious';
    case 'recommendation':
      return 'moderate';
    case 'potentialviolation':
    case 'potentialrecommendation':
    case 'manual':
      return 'minor';
    // 'pass' y otros -> sin impacto
    default:
      return undefined;
  }
}

export function mapEqualAccessToUnified(
  eaReport: EqualAccessReport,
  wcagVersion: '2.0' | '2.1' | '2.2',
  wcagLevel: 'A' | 'AA' | 'AAA'
): UnifiedToolResult {
  const counts = eaReport?.summary?.counts ?? {};
  const items = (eaReport?.results ?? []).map((r: EqualAccessResult) => {
    const level = (r.level ?? '').toLowerCase(); // e.g., 'violation', 'potentialviolation', 'recommendation', 'potentialrecommendation', 'manual', 'pass'
    let type: BaseItem['type'] = 'pass';
    if (level === 'violation') type = 'violation';
    else if (level === 'recommendation') type = 'recommendation';
    else if (
      level === 'potentialviolation' ||
      level === 'potentialrecommendation' ||
      level === 'manual'
    )
      type = 'needsReview';

    return {
      id: r.ruleId,
      tool: 'equal-access' as const,
      type,
      impact: mapImpactFromLevel(level),
      help: r.message,
      helpUrl: undefined,
      nodes: [
        {
          target: r.path?.aria ? [r.path.aria] : undefined,
          html: r.snippet,
          failureSummary: r.value?.join?.(', '),
        },
      ],
      wcag: { version: wcagVersion, level: wcagLevel, criterion: null },
    } as BaseItem;
  });

  const stats = {
    violations: counts.violation ?? 0,
    needsReview:
      (counts.potentialviolation ?? 0) +
      (counts.potentialrecommendation ?? 0) +
      (counts.manual ?? 0),
    recommendations: counts.recommendation ?? 0,
    passes: counts.pass ?? 0,
    incomplete: 0,
    inapplicable: 0,
  };

  return { tool: 'equal-access', stats, items };
}

export function buildUnifiedResponse(
  parts: UnifiedToolResult[]
): UnifiedResponse {
  const meta: UnifiedResponse['meta'] = {};
  for (const p of parts) {
    meta[p.tool] = { ...p.stats };
  }
  const total = parts.reduce(
    (acc, p) =>
      acc + p.stats.violations + p.stats.needsReview + p.stats.recommendations,
    0
  );
  return { ok: true, meta, results: parts, total };
}
