type BaseItem = {
  id: string;
  tool: 'axe-core' | 'equal-access';
  type: 'violation' | 'needsReview' | 'recommendation' | 'pass' | 'inapplicable' | 'incomplete';
  impact?: string;
  help?: string;
  helpUrl?: string;
  nodes?: Array<{ target?: string[]; html?: string; failureSummary?: string }>;
  wcag?: { version: '2.0' | '2.1' | '2.2'; level: 'A' | 'AA' | 'AAA'; criterion?: string | null };
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
    ['axe-core']?: Omit<UnifiedToolResult['stats'], 'needsReview' | 'recommendations'> & {
      needsReview?: number;
      recommendations?: number;
    };
    ['equal-access']?: UnifiedToolResult['stats'];
  };
  results: UnifiedToolResult[];
  total: number; // suma de violations + needsReview + recommendations
};

export function mapAxeToUnified(axe: any, wcagVersion: '2.0' | '2.1' | '2.2', wcagLevel: 'A' | 'AA' | 'AAA'): UnifiedToolResult {
  const toItems = (arr: any[], type: BaseItem['type']) =>
    arr.map((r) => ({
      id: r.id,
      tool: 'axe-core' as const,
      type,
      impact: r.impact,
      help: r.help,
      helpUrl: r.helpUrl,
      nodes: (r.nodes ?? []).map((n: any) => ({
        target: n.target,
        html: n.html,
        failureSummary: n.failureSummary
      })),
      wcag: { version: wcagVersion, level: wcagLevel, criterion: null }
    }));

  const items = [
    ...toItems(axe.violations ?? [], 'violation'),
    ...toItems(axe.passes ?? [], 'pass'),
    ...toItems(axe.incomplete ?? [], 'incomplete'),
    ...toItems(axe.inapplicable ?? [], 'inapplicable')
  ];

  const stats = {
    violations: (axe.violations ?? []).length,
    needsReview: 0, // axe no expone potenciales como tal
    recommendations: 0, // axe no expone recomendaciones
    passes: (axe.passes ?? []).length,
    incomplete: (axe.incomplete ?? []).length,
    inapplicable: (axe.inapplicable ?? []).length
  };

  return { tool: 'axe-core', stats, items };
}

export function mapEqualAccessToUnified(eaReport: any, wcagVersion: '2.0' | '2.1' | '2.2', wcagLevel: 'A' | 'AA' | 'AAA'): UnifiedToolResult {
  const counts = eaReport?.summary?.counts ?? {};
  const items = (eaReport?.results ?? []).map((r: any) => {
    const level = (r.level ?? '').toLowerCase(); // e.g., 'violation', 'potentialviolation', 'recommendation', 'potentialrecommendation', 'manual', 'pass'
    let type: BaseItem['type'] = 'pass';
    if (level === 'violation') type = 'violation';
    else if (level === 'recommendation') type = 'recommendation';
    else if (level === 'potentialviolation' || level === 'potentialrecommendation' || level === 'manual') type = 'needsReview';

    return {
      id: r.ruleId,
      tool: 'equal-access' as const,
      type,
      impact: undefined,
      help: r.message,
      helpUrl: undefined,
      nodes: [{
        target: r.path?.aria ? [r.path.aria] : undefined,
        html: r.snippet,
        failureSummary: r.value?.join?.(', ')
      }],
      wcag: { version: wcagVersion, level: wcagLevel, criterion: null }
    } as BaseItem;
  });

  const stats = {
    violations: counts.violation ?? 0,
    needsReview: (counts.potentialviolation ?? 0) + (counts.potentialrecommendation ?? 0) + (counts.manual ?? 0),
    recommendations: counts.recommendation ?? 0,
    passes: counts.pass ?? 0,
    incomplete: 0,
    inapplicable: 0
  };

  return { tool: 'equal-access', stats, items };
}

export function buildUnifiedResponse(parts: UnifiedToolResult[]): UnifiedResponse {
  const meta: UnifiedResponse['meta'] = {};
  for (const p of parts) {
    meta[p.tool] = { ...p.stats };
  }
  const total = parts.reduce((acc, p) => acc + p.stats.violations + p.stats.needsReview + p.stats.recommendations, 0);
  return { ok: true, meta, results: parts, total };
}