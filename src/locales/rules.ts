import rulesEs from './rules.es.json';
import rulesEn from './rules.en.json';

type Rule = {
  code: string;
  guideline: string;
  level: string;
  version: string;
  description: string;
};

// Simple caché en memoria para reglas por idioma
const rulesCache: Record<string, Rule[]> = {};

function getRules(lang: string): Rule[] {
  if (!rulesCache[lang]) {
    if (lang === 'en') {
      rulesCache['en'] = rulesEn as Rule[];
    } else {
      rulesCache['es'] = rulesEs as Rule[];
    }
  }
  return rulesCache[lang];
}

/**
 * Busca la descripción de una regla por cualquier campo clave (code, guideline, level, version) y lenguaje.
 * @param query valor a buscar (puede ser code, guideline, level o version)
 * @param lang idioma preferido ('es' o 'en')
 * @param field campo a buscar ('code', 'guideline', 'level', 'version'), por defecto 'code'
 * @returns descripción localizada o undefined
 */
export function getRuleDescription(query: string, lang: string = 'es', field: 'code' | 'guideline' | 'level' | 'version' = 'code'): string | undefined {
  const arr = getRules(lang) || getRules('es');
  return arr.find(r => r[field] === query)?.description;
}

export default { getRules };