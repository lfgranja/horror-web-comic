import AxeBuilder from '@axe-core/playwright';

export const NORMATIVE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'];
export const EXPLICIT_RULES = ['target-size', 'color-contrast-enhanced'];

/**
 * Creates an AxeBuilder instance configured with normative WCAG 2.2 AAA tags and explicit rules.
 * Scans the full document root scope without arbitrary .include() or .exclude() restrictions.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {AxeBuilder}
 */
export const createAxeBuilder = (page) =>
  new AxeBuilder({ page })
    .options({
      runOnly: {
        type: 'tag',
        values: NORMATIVE_TAGS
      },
      rules: {
        'color-contrast-enhanced': { enabled: true },
        'target-size': { enabled: true }
      }
    });

// Backward compatibility alias per Contracts §4
export const makeAxe = createAxeBuilder;

/**
 * Formats inconclusive axe diagnostics into structured console warnings and returns
 * an array of projected nodes adhering to contracts/test-suite-api.md §5.2.
 *
 * @param {Array<{ id: string, impact?: string, help?: string, description?: string, nodes: Array<any> }>} incomplete
 * @returns {Array<{ id: string, impact: string, help: string, target: string }>} Projected diagnostics array
 */
export function formatIncompleteDiagnostics(incomplete = []) {
  if (!incomplete || incomplete.length === 0) {
    return [];
  }

  const tableData = incomplete.map((item) => ({
    id: item.id,
    impact: item.impact ?? 'unspecified',
    nodes: item.nodes ? item.nodes.length : 0
  }));
  console.warn(`[A11Y-WARN] ${incomplete.length} diagnósticos inconclusivos requerem inspeção visual humana:`);
  console.table(tableData);

  return incomplete.flatMap((item) =>
    (item.nodes || []).map((node) => ({
      id: item.id,
      impact: item.impact ?? 'unspecified',
      help: item.help || item.description || '',
      target: Array.isArray(node.target) ? node.target.join(', ') : String(node.target || '')
    }))
  );
}

/**
 * Computes relative luminance of an sRGB color per WCAG 2.2 specification.
 *
 * @param {{ r: number, g: number, b: number } | [number, number, number] | string} rgb
 * @returns {number} Relative luminance in range [0, 1]
 */
export function relativeLuminance(rgb) {
  const { r, g, b } = parseColorToRgb(rgb);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = Math.max(0, Math.min(255, Number(c) || 0)) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates the contrast ratio between two sRGB colors per WCAG 2.2 formula:
 * (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter color.
 *
 * @param {{ r: number, g: number, b: number } | [number, number, number] | string} fg Foreground RGB
 * @param {{ r: number, g: number, b: number } | [number, number, number] | string} bg Background RGB
 * @returns {number} Contrast ratio between 1 and 21
 */
export function calculateContrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parses a color input (object, array tuple, or string) into an { r, g, b } record.
 *
 * @param {{ r: number, g: number, b: number } | [number, number, number] | string} color
 * @returns {{ r: number, g: number, b: number }}
 */
export function parseColorToRgb(color) {
  if (Array.isArray(color) && color.length >= 3) {
    return {
      r: Number(color[0]) || 0,
      g: Number(color[1]) || 0,
      b: Number(color[2]) || 0
    };
  }
  if (typeof color === 'object' && color !== null && 'r' in color && 'g' in color && 'b' in color) {
    return {
      r: Number(color.r) || 0,
      g: Number(color.g) || 0,
      b: Number(color.b) || 0
    };
  }
  if (typeof color === 'string') {
    const hex = color.trim().replace(/^#/, '');
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16) || 0,
        g: parseInt(hex[1] + hex[1], 16) || 0,
        b: parseInt(hex[2] + hex[2], 16) || 0
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16) || 0,
        g: parseInt(hex.slice(2, 4), 16) || 0,
        b: parseInt(hex.slice(4, 6), 16) || 0
      };
    }
    const rgbMatch = color.match(/rgba?\(\s*([\d.]+)[,\s]+\s*([\d.]+)[,\s]+\s*([\d.]+)/i);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10) || 0,
        g: parseInt(rgbMatch[2], 10) || 0,
        b: parseInt(rgbMatch[3], 10) || 0
      };
    }
  }
  return { r: 0, g: 0, b: 0 };
}

/**
 * Assesses whether a contrast ratio meets WCAG 2.2 AAA enhanced requirements:
 * >= 7:1 for normal text, >= 4.5:1 for large text (>= 18pt or >= 14pt bold).
 * Polymorphic: accepts either (contrastRatioNumber, isLargeText) or (foregroundColor, backgroundColor, isLargeText).
 *
 * @param {number|string|{r:number,g:number,b:number}} contrastOrFg
 * @param {boolean|string|{r:number,g:number,b:number}} [bgOrIsLargeText=false]
 * @param {boolean} [isLargeText=false]
 * @returns {boolean}
 */
export function meetsContrastEnhanced(contrastOrFg, bgOrIsLargeText = false, isLargeText = false) {
  if (typeof contrastOrFg === 'number') {
    const isLarge = Boolean(bgOrIsLargeText);
    return isLarge ? contrastOrFg >= 4.5 : contrastOrFg >= 7.0;
  }
  const fg = parseColorToRgb(contrastOrFg);
  const bg = parseColorToRgb(bgOrIsLargeText);
  const ratio = calculateContrastRatio(fg, bg);
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}
