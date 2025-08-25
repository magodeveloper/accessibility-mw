import es from './es.json';
import en from './en.json';

type LocaleMessages = Record<string, string>;
const locales: Record<string, LocaleMessages> = { es, en };

export function t(key: string, lang: string = 'es'): string {
  return locales[lang]?.[key] || locales['es'][key] || key;
}

export default locales;