// Scaffold (T007) — implementation pending TDD gate (T012) and T011b/T023a.
// Contract: gate de sanitização/validação SVG (FR-002). Fail-closed over the
// vectorcraft allow-list vocabulary; reject-list is a floor, not exhaustive.
// Full implementation must land only after svg-sanitize.test.js is RED.

/**
 * Sanitize/validate an SVG master. Throws on any violation (naming the vector).
 * @param {string|Buffer} input - Raw SVG bytes or text.
 * @param {object} [options]
 * @param {number} [options.maxBytes] - Override file-size cap (default SVG_DOS_CAPS.maxBytes).
 * @returns {{ ok: true }} Result marker on success.
 * @throws {Error} On any sanitization/validation violation (code on error.code).
 */
export function sanitizeSvg(input, options = {}) {
  throw new Error('sanitizeSvg: not implemented (scaffold T007)');
}

/**
 * Whether a value is a safe SVG URL reference (fragment-only `#…`).
 * @param {string} value
 * @returns {boolean}
 */
export function isSafeSvgReference(value) {
  throw new Error('isSafeSvgReference: not implemented (scaffold T007)');
}

/**
 * DoS caps for the SVG gate (FR-002 / plan.md "SVG allow-list").
 * @type {Readonly<{maxBytes:number,maxElements:number,maxNestingDepth:number,maxAttributesPerElement:number,maxExpandedReferences:number,maxReferenceDepth:number}>}
 */
export const SVG_DOS_CAPS = Object.freeze({
  maxBytes: 1_048_576,
  maxElements: 10_000,
  maxNestingDepth: 100,
  maxAttributesPerElement: 256,
  maxExpandedReferences: 100_000,
  maxReferenceDepth: 20
});

export const ALLOWED_SVG_ELEMENTS = Object.freeze([
  'svg', 'g', 'defs', 'title', 'desc', 'path', 'rect', 'circle', 'ellipse',
  'line', 'polyline', 'polygon', 'text', 'tspan', 'use', 'linearGradient',
  'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'symbol'
]);

// Attribute allow-list (mirror of plan.md "SVG allow-list" vocabulary). Single
// source for T012/T023; keep in sync with plan.md (remediation C2).
export const ALLOWED_SVG_ATTRIBUTES = Object.freeze([
  'id', 'class', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r',
  'rx', 'ry', 'width', 'height', 'points', 'transform', 'transform-origin',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
  'stroke-miterlimit', 'opacity', 'viewBox', 'preserveAspectRatio', 'xmlns',
  'xmlns:xlink', 'font-family', 'font-size', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'letter-spacing', 'gradientUnits',
  'gradientTransform', 'offset', 'stop-color', 'stop-opacity', 'clip-path',
  'mask', 'patternUnits', 'patternTransform', 'href', 'xlink:href'
]);