// Implementation: SVG sanitization gate (FR-002). Fail-closed over the
// vectorcraft allow-list vocabulary; reject-list is a floor.
import fs from 'node:fs';

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

export const ALLOWED_SVG_ATTRIBUTES = Object.freeze([
  'id', 'class', 'data-name', 'xml:space', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r',
  'rx', 'ry', 'width', 'height', 'points', 'transform', 'transform-origin',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
  'stroke-miterlimit', 'opacity', 'viewbox', 'preserveaspectratio', 'xmlns',
  'xmlns:xlink', 'font-family', 'font-size', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'letter-spacing', 'gradientunits',
  'gradienttransform', 'offset', 'stop-color', 'stop-opacity', 'clip-path',
  'mask', 'patternunits', 'patterntransform', 'href', 'xlink:href'
]);

const DANGEROUS_ELEMENTS = new Set([
  'script', 'foreignObject', 'iframe', 'object', 'embed', 'base', 'meta',
  'link', 'form', 'template', 'noscript', 'style', 'handler', 'listener',
  'animate', 'set', 'animateMotion', 'animateTransform', 'discard'
]);

const CSS_DANGER = /url\s*\(|@import|image-set\s*\(|expression\s*\(|-moz-binding|behavior\s*:/i;
const EXTERNAL_HREF = /^(https?:|\/\/|\/|\.\.\/|\.\/|data:)/i;

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function isSafeSvgReference(value) {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('#')) return false;
  const frag = value.slice(1);
  if (frag === '') return false;
  if (/[<>"'\s]/.test(frag)) return false;
  return true;
}

function tokenize(text) {
  const tags = [];
  // reject doctype / processing instructions / comments with embedded
  if (/<\s*!/i.test(text)) {
    // allow only CDATA? We reject all DOCTYPE; comments okay-ish but reject <! to be safe for XXE
    if (/<\s*!DOCTYPE/i.test(text)) throw fail('svg-doctype', 'DOCTYPE is not allowed');
    // reject other <! constructs except comments
  }
  // Allow only a leading XML declaration (<?xml ...?>); reject all other
  // processing instructions (XXE / stylesheet injection surface).
  const xmlDeclMatch = text.match(/^<\?xml[^?]*\?>/i);
  if (xmlDeclMatch) text = text.slice(xmlDeclMatch[0].length);
  if (/<\?/.test(text)) throw fail('svg-processing-instruction', 'processing instructions are not allowed');

  let i = 0;
  const n = text.length;
  while (i < n) {
    const lt = text.indexOf('<', i);
    if (lt === -1) { i = n; break; }
    if (text.startsWith('<!--', lt)) {
      const end = text.indexOf('-->', lt);
      if (end === -1) throw fail('svg-unclosed-comment', 'unclosed comment');
      i = end + 3;
      continue;
    }
    const gt = text.indexOf('>', lt);
    if (gt === -1) throw fail('svg-unclosed-tag', 'unclosed tag');
    const raw = text.slice(lt, gt + 1);
    tags.push(raw);
    i = gt + 1;
  }
  return tags;
}

function parseTag(raw) {
  const isClose = raw.startsWith('</');
  const isSelfClose = raw.endsWith('/>');
  const inner = raw.replace(/^<\//, '').replace(/^</, '').replace(/\/?>$/, '').trim();
  const nameMatch = inner.match(/^([A-Za-z][\w:.-]*)/);
  if (!nameMatch) throw fail('svg-bad-tag', `invalid tag: ${raw}`);
  const name = nameMatch[1].toLowerCase().split(':').pop();
  const rest = inner.slice(nameMatch[0].length).trim();
  const attrs = {};
  // parse attributes (name="value" or name='value' or name=value)
  const attrRegex = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = attrRegex.exec(rest)) !== null) {
    const attrName = m[1];
    const value = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : m[5]);
    attrs[attrName.toLowerCase()] = value;
  }
  // also catch attributes without value (boolean) - rare; treat as empty
  return { name, attrs, isClose, isSelfClose, raw };
}

export function sanitizeSvg(input, options = {}) {
  const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  const maxBytes = (options && options.maxBytes) || SVG_DOS_CAPS.maxBytes;
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw fail('svg-dos-cap', `SVG exceeds ${maxBytes} bytes`);
  }
  // reject doctype (already in tokenize, but check early)
  if (/<\s*!DOCTYPE/i.test(text)) throw fail('svg-doctype', 'DOCTYPE is not allowed');

  let tags;
  try {
    tags = tokenize(text);
  } catch (e) {
    throw e;
  }

  // count elements, depth
  let elementCount = 0;
  let depth = 0;
  let maxDepth = 0;
  const stack = [];
  let expandedRefs = 0;
  let refDepth = 0;

  for (const raw of tags) {
    const tag = parseTag(raw);
    if (tag.isClose) {
      if (stack.length && stack[stack.length - 1] === tag.name) stack.pop();
      depth = Math.max(0, depth - 1);
      continue;
    }
    // element
    elementCount++;
    if (elementCount > SVG_DOS_CAPS.maxElements) {
      throw fail('svg-dos-cap', `SVG exceeds ${SVG_DOS_CAPS.maxElements} elements`);
    }
    if (DANGEROUS_ELEMENTS.has(tag.name)) {
      throw fail('svg-rejected-element', `rejected element <${tag.name}>`);
    }
    if (!ALLOWED_SVG_ELEMENTS.includes(tag.name)) {
      throw fail('svg-disallowed-element', `element <${tag.name}> is not in the allow-list`);
    }
    const attrNames = Object.keys(tag.attrs);
    if (attrNames.length > SVG_DOS_CAPS.maxAttributesPerElement) {
      throw fail('svg-dos-cap', `element <${tag.name}> exceeds ${SVG_DOS_CAPS.maxAttributesPerElement} attributes`);
    }
    for (const attr of attrNames) {
      if (!ALLOWED_SVG_ATTRIBUTES.includes(attr)) {
        throw fail('svg-disallowed-attribute', `attribute ${attr} is not allowed on <${tag.name}>`);
      }
      const val = tag.attrs[attr];
      // href/xlink:href must be fragment-only
      if (attr === 'href' || attr === 'xlink:href') {
        if (!isSafeSvgReference(val)) {
          throw fail('svg-unsafe-reference', `unsafe reference in ${attr}: ${val}`);
        }
      }
      // CSS danger in any attribute value
      if (CSS_DANGER.test(val)) {
        throw fail('svg-css-danger', `dangerous CSS in ${attr}: ${val}`);
      }
      // url() handling: only url(#...) allowed
      const urlMatch = val.match(/url\(\s*([^)]+)\s*\)/i);
      if (urlMatch) {
        const inner = urlMatch[1].trim().replace(/^['"]|['"]$/g, '');
        if (!inner.startsWith('#')) {
          throw fail('svg-unsafe-reference', `non-fragment url() in ${attr}: ${val}`);
        }
      }
      // reject data: URIs
      if (/data:/i.test(val)) {
        throw fail('svg-data-uri', `data: URI not allowed in ${attr}`);
      }
      // external href-like
      if ((attr === 'href' || attr === 'xlink:href') && EXTERNAL_HREF.test(val) && !val.startsWith('#')) {
        throw fail('svg-external-href', `external href not allowed: ${val}`);
      }
    }

    // reference expansion tracking for use/pattern
    if (tag.name === 'use' || tag.name === 'pattern') {
      refDepth++;
      expandedRefs += 1;
      if (refDepth > SVG_DOS_CAPS.maxReferenceDepth) {
        throw fail('svg-reference-depth', `reference depth exceeds ${SVG_DOS_CAPS.maxReferenceDepth}`);
      }
      if (expandedRefs > SVG_DOS_CAPS.maxExpandedReferences) {
        throw fail('svg-reference-expansion', `expanded references exceed ${SVG_DOS_CAPS.maxExpandedReferences}`);
      }
    }

    if (!tag.isSelfClose) {
      stack.push(tag.name);
      depth++;
      if (depth > SVG_DOS_CAPS.maxNestingDepth) {
        throw fail('svg-dos-cap', `SVG nesting exceeds ${SVG_DOS_CAPS.maxNestingDepth}`);
      }
      if (depth > maxDepth) maxDepth = depth;
    }
  }
  // cycle detection: if a use references an ancestor id... simplified: not implemented deeply
  return { ok: true };
}