import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg, isSafeSvgReference, SVG_DOS_CAPS } from '../../scripts/svg-sanitize.mjs';

test('sanitizeSvg accepts minimal safe svg', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>';
  assert.doesNotThrow(() => sanitizeSvg(svg));
});

test('sanitizeSvg rejects script element', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  assert.throws(() => sanitizeSvg(svg));
});

test('isSafeSvgReference accepts fragment', () => {
  assert.equal(isSafeSvgReference('#a'), true);
  assert.equal(isSafeSvgReference('http://x'), false);
});
