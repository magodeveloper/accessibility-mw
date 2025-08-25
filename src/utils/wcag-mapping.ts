// Mapeo de reglas de accessibility a criterios WCAG
// Este mapeo conecta las reglas de axe-core y Equal Access con los criterios WCAG correspondientes

export type WcagLevel = 'A' | 'AA' | 'AAA';
export type WcagVersion = '2.0' | '2.1' | '2.2';

export interface WcagMapping {
  criterion: string;
  level: WcagLevel;
  version: WcagVersion;
}

// Mapeo de reglas de axe-core a criterios WCAG
export const axeWcagMapping: Record<string, WcagMapping> = {
  'area-alt': { criterion: '1.1.1', level: 'A', version: '2.0' },
  'aria-allowed-attr': { criterion: '4.1.2', level: 'A', version: '2.0' },
  'aria-command-name': { criterion: '4.1.2', level: 'A', version: '2.1' },
  'aria-hidden-body': { criterion: '4.1.2', level: 'A', version: '2.1' },
  'aria-hidden-focus': { criterion: '4.1.2', level: 'A', version: '2.1' },
  'aria-input-field-name': { criterion: '4.1.2', level: 'A', version: '2.1' },
  'aria-label': { criterion: '4.1.2', level: 'A', version: '2.1' },
  'aria-labelledby': { criterion: '4.1.2', level: 'A', version: '2.1' },
  'aria-required-attr': { criterion: '4.1.2', level: 'A', version: '2.0' },
  'aria-required-children': { criterion: '1.3.1', level: 'A', version: '2.0' },
  'aria-required-parent': { criterion: '1.3.1', level: 'A', version: '2.0' },
  'aria-roles': { criterion: '4.1.2', level: 'A', version: '2.0' },
  'aria-toggle-field-name': { criterion: '4.1.2', level: 'A', version: '2.1' },
  'aria-tooltip-name': { criterion: '4.1.2', level: 'A', version: '2.1' },
  'aria-valid-attr-value': { criterion: '4.1.2', level: 'A', version: '2.0' },
  'aria-valid-attr': { criterion: '4.1.2', level: 'A', version: '2.0' },
  'button-name': { criterion: '4.1.2', level: 'A', version: '2.0' },
  bypass: { criterion: '2.4.1', level: 'A', version: '2.0' },
  'color-contrast': { criterion: '1.4.3', level: 'AA', version: '2.0' },
  'color-contrast-enhanced': {
    criterion: '1.4.6',
    level: 'AAA',
    version: '2.0',
  },
  'document-title': { criterion: '2.4.2', level: 'A', version: '2.0' },
  'duplicate-id': { criterion: '4.1.1', level: 'A', version: '2.0' },
  'duplicate-id-active': { criterion: '4.1.1', level: 'A', version: '2.0' },
  'duplicate-id-aria': { criterion: '4.1.1', level: 'A', version: '2.0' },
  'form-field-multiple-labels': {
    criterion: '3.3.2',
    level: 'A',
    version: '2.0',
  },
  'frame-title': { criterion: '4.1.2', level: 'A', version: '2.0' },
  'html-has-lang': { criterion: '3.1.1', level: 'A', version: '2.0' },
  'html-lang-valid': { criterion: '3.1.1', level: 'A', version: '2.0' },
  'html-xml-lang-mismatch': { criterion: '3.1.1', level: 'A', version: '2.0' },
  'image-alt': { criterion: '1.1.1', level: 'A', version: '2.0' },
  'input-button-name': { criterion: '4.1.2', level: 'A', version: '2.0' },
  'input-image-alt': { criterion: '1.1.1', level: 'A', version: '2.0' },
  label: { criterion: '4.1.2', level: 'A', version: '2.0' },
  lang: { criterion: '3.1.2', level: 'AA', version: '2.0' },
  'link-in-text-block': { criterion: '1.4.1', level: 'A', version: '2.0' },
  'link-name': { criterion: '2.4.4', level: 'A', version: '2.0' },
  list: { criterion: '1.3.1', level: 'A', version: '2.0' },
  listitem: { criterion: '1.3.1', level: 'A', version: '2.0' },
  'meta-refresh': { criterion: '2.2.1', level: 'A', version: '2.0' },
  'meta-viewport': { criterion: '1.4.4', level: 'AA', version: '2.1' },
  'object-alt': { criterion: '1.1.1', level: 'A', version: '2.0' },
  'role-img-alt': { criterion: '1.1.1', level: 'A', version: '2.1' },
  'scrollable-region-focusable': {
    criterion: '2.1.1',
    level: 'A',
    version: '2.1',
  },
  'server-side-image-map': { criterion: '2.1.1', level: 'A', version: '2.0' },
  'svg-img-alt': { criterion: '1.1.1', level: 'A', version: '2.1' },
  'td-headers-attr': { criterion: '1.3.1', level: 'A', version: '2.0' },
  'th-has-data-cells': { criterion: '1.3.1', level: 'A', version: '2.0' },
  'valid-lang': { criterion: '3.1.1', level: 'A', version: '2.0' },
  'video-caption': { criterion: '1.2.2', level: 'A', version: '2.0' },
};

// Mapeo de reglas de Equal Access (IBM) a criterios WCAG
export const equalAccessWcagMapping: Record<string, WcagMapping> = {
  html_lang_exists: { criterion: '3.1.1', level: 'A', version: '2.0' },
  html_skipnav_exists: { criterion: '2.4.1', level: 'A', version: '2.0' },
  page_title_exists: { criterion: '2.4.2', level: 'A', version: '2.0' },
  aria_semantics_role: { criterion: '4.1.2', level: 'A', version: '2.0' },
  aria_semantics_attribute: { criterion: '4.1.2', level: 'A', version: '2.0' },
  form_label_unique: { criterion: '4.1.2', level: 'A', version: '2.0' },
  input_label_exists: { criterion: '4.1.2', level: 'A', version: '2.0' },
  input_label_visible: { criterion: '3.3.2', level: 'A', version: '2.0' },
  element_id_unique: { criterion: '4.1.1', level: 'A', version: '2.0' },
  heading_content_exists: { criterion: '2.4.6', level: 'AA', version: '2.0' },
  heading_markup_misuse: { criterion: '1.3.1', level: 'A', version: '2.0' },
  list_markup_review: { criterion: '1.3.1', level: 'A', version: '2.0' },
  img_alt_exists: { criterion: '1.1.1', level: 'A', version: '2.0' },
  img_alt_decorative: { criterion: '1.1.1', level: 'A', version: '2.0' },
  img_alt_null: { criterion: '1.1.1', level: 'A', version: '2.0' },
  link_text_exists: { criterion: '2.4.4', level: 'A', version: '2.0' },
  table_headers_exists: { criterion: '1.3.1', level: 'A', version: '2.0' },
  table_structure_misuse: { criterion: '1.3.1', level: 'A', version: '2.0' },
  media_alt_exists: { criterion: '1.1.1', level: 'A', version: '2.0' },
  media_track_available: { criterion: '1.2.2', level: 'A', version: '2.0' },
  color_contrast_sufficient: {
    criterion: '1.4.3',
    level: 'AA',
    version: '2.0',
  },
  color_contrast_enhanced: { criterion: '1.4.6', level: 'AAA', version: '2.0' },
  focus_visible: { criterion: '2.4.7', level: 'AA', version: '2.0' },
  keyboard_accessible: { criterion: '2.1.1', level: 'A', version: '2.0' },
  bypass_main_exists: { criterion: '2.4.1', level: 'A', version: '2.0' },
  landmark_main_single: { criterion: '1.3.1', level: 'A', version: '2.0' },
  landmark_name_unique: { criterion: '1.3.1', level: 'A', version: '2.1' },
};

interface AnalysisItem {
  id?: string;
  ruleId?: string;
  wcag?: {
    criterion?: string;
    level?: WcagLevel;
    version?: WcagVersion;
  };
  tool?: 'axe-core' | 'equal-access';
  source?: string;
}

/**
 * Obtiene el mapeo WCAG para un elemento de análisis
 * @param item - Item del análisis con información sobre la regla
 * @returns Información del criterio WCAG o valor por defecto
 */
export function getWcagMapping(item: AnalysisItem): WcagMapping {
  // Si ya tiene información WCAG en el item, úsala
  if (item.wcag?.criterion) {
    return {
      criterion: item.wcag.criterion,
      level: item.wcag.level || 'A',
      version: item.wcag.version || '2.1',
    };
  }

  // Mapeo basado en el tool/source
  const ruleId = item.id || item.ruleId;

  if (!ruleId) {
    // Valor por defecto para elementos sin regla identificada
    return {
      criterion: '4.1.2',
      level: 'A',
      version: '2.1',
    };
  }

  // Buscar en mapeo de axe-core
  if (axeWcagMapping[ruleId]) {
    return axeWcagMapping[ruleId];
  }

  // Buscar en mapeo de Equal Access
  if (equalAccessWcagMapping[ruleId]) {
    return equalAccessWcagMapping[ruleId];
  }

  // Mapeo por defecto basado en el tipo de problema
  if (ruleId.includes('color') || ruleId.includes('contrast')) {
    return { criterion: '1.4.3', level: 'AA', version: '2.0' };
  }

  if (ruleId.includes('aria') || ruleId.includes('role')) {
    return { criterion: '4.1.2', level: 'A', version: '2.0' };
  }

  if (ruleId.includes('heading') || ruleId.includes('title')) {
    return { criterion: '2.4.6', level: 'AA', version: '2.0' };
  }

  if (ruleId.includes('label') || ruleId.includes('form')) {
    return { criterion: '4.1.2', level: 'A', version: '2.0' };
  }

  if (
    ruleId.includes('image') ||
    ruleId.includes('img') ||
    ruleId.includes('alt')
  ) {
    return { criterion: '1.1.1', level: 'A', version: '2.0' };
  }

  if (ruleId.includes('link')) {
    return { criterion: '2.4.4', level: 'A', version: '2.0' };
  }

  if (ruleId.includes('lang') || ruleId.includes('language')) {
    return { criterion: '3.1.1', level: 'A', version: '2.0' };
  }

  if (ruleId.includes('focus') || ruleId.includes('keyboard')) {
    return { criterion: '2.1.1', level: 'A', version: '2.0' };
  }

  // Valor por defecto
  return {
    criterion: '4.1.2',
    level: 'A',
    version: '2.1',
  };
}

/**
 * Genera un ID de criterio WCAG basado en la cadena del criterio
 * @param criterion - String del criterio (ej: "1.1.1", "2.4.4")
 * @returns ID numérico único para el criterio
 */
export function getWcagCriterionId(criterion: string): number {
  // Mapeo simple: convertir "1.1.1" a 111, "2.4.4" a 244, etc.
  const cleaned = criterion.replace(/\./g, '');
  const numericId = parseInt(cleaned, 10);

  // Asegurar que sea mayor que 0
  return numericId > 0 ? numericId : 1;
}

/**
 * Valida que un criterio WCAG sea válido
 * @param criterion - String del criterio a validar
 * @returns true si es válido, false si no
 */
export function isValidWcagCriterion(criterion: string): boolean {
  const pattern = /^\d+\.\d+\.\d+$/;
  return pattern.test(criterion) && criterion !== '0.0.0';
}
