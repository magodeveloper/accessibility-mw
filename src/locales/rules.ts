import rulesEn from './rules.en.json';
import rulesEs from './rules.es.json';

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
      // Para cualquier idioma no soportado, usar español como fallback
      rulesCache[lang] = rulesEs as Rule[];
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
export function getRuleDescription(
  query: string,
  lang: string = 'es',
  field: 'code' | 'guideline' | 'level' | 'version' = 'code'
): string | undefined {
  const arr = getRules(lang) || getRules('es');
  return arr.find(r => r[field] === query)?.description;
}

export default { getRules };
