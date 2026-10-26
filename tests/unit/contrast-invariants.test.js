import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  relativeLuminance,
  calculateContrastRatio,
  meetsContrastEnhanced
} from '../e2e/helpers/axe-helper.js';

const rgbArbitrary = fc.record({
  r: fc.integer({ min: 0, max: 255 }),
  g: fc.integer({ min: 0, max: 255 }),
  b: fc.integer({ min: 0, max: 255 })
});

const hexColorArbitrary = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

const arrayTupleArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
);

const rgbStringArbitrary = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);

const anyColorArbitrary = fc.oneof(
  rgbArbitrary,
  arrayTupleArbitrary,
  hexColorArbitrary,
  rgbStringArbitrary
);

test('Contrast Invariants (PBT): relative luminance is bounded in [0.0, 1.0]', () => {
  fc.assert(
    fc.property(rgbArbitrary, (color) => {
      const L = relativeLuminance(color);
      return L >= 0.0 && L <= 1.0 + 1e-6;
    }),
    { numRuns: 200 }
  );
});

test('Contrast Invariants (PBT): relative luminance satisfies component-wise monotonicity', () => {
  fc.assert(
    fc.property(
      rgbArbitrary,
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      (c1, dr, dg, db) => {
        const c2 = {
          r: Math.min(255, c1.r + dr),
          g: Math.min(255, c1.g + dg),
          b: Math.min(255, c1.b + db)
        };
        const L1 = relativeLuminance(c1);
        const L2 = relativeLuminance(c2);
        return L1 <= L2 + 1e-6;
      }
    ),
    { numRuns: 200 }
  );
});

test('Contrast Invariants (PBT): contrast ratio is symmetric: CR(c1, c2) === CR(c2, c1)', () => {
  fc.assert(
    fc.property(rgbArbitrary, rgbArbitrary, (c1, c2) => {
      const cr1 = calculateContrastRatio(c1, c2);
      const cr2 = calculateContrastRatio(c2, c1);
      return Math.abs(cr1 - cr2) < 1e-9;
    }),
    { numRuns: 200 }
  );
});

test('Contrast Invariants (PBT): contrast ratio of identical colors is exactly 1.0', () => {
  fc.assert(
    fc.property(rgbArbitrary, (color) => {
      const cr = calculateContrastRatio(color, color);
      return Math.abs(cr - 1.0) < 1e-9;
    }),
    { numRuns: 200 }
  );
});

test('Contrast Invariants (PBT): contrast ratio is strictly bounded within [1.0, 21.0]', () => {
  fc.assert(
    fc.property(rgbArbitrary, rgbArbitrary, (c1, c2) => {
      const cr = calculateContrastRatio(c1, c2);
      return cr >= 1.0 - 1e-9 && cr <= 21.0 + 1e-9;
    }),
    { numRuns: 200 }
  );
});

test('Contrast Invariants (PBT): meetsContrastEnhanced predicates are monotonic and correct', () => {
  fc.assert(
    fc.property(fc.double({ min: 1.0, max: 21.0, noNaN: true }), (cr) => {
      const normalResult = meetsContrastEnhanced(cr, false);
      const largeResult = meetsContrastEnhanced(cr, true);

      assert.equal(normalResult, cr >= 7.0);
      assert.equal(largeResult, cr >= 4.5);
      // If normal passes, large must always pass
      if (normalResult) {
        assert.equal(largeResult, true);
      }
      return true;
    }),
    { numRuns: 200 }
  );
});

test('Contrast Invariants (PBT): relative luminance of arbitrary hex color strings is bounded in [0.0, 1.0] and not NaN', () => {
  fc.assert(
    fc.property(hexColorArbitrary, (hex) => {
      const L = relativeLuminance(hex);
      return !Number.isNaN(L) && L >= 0.0 && L <= 1.0 + 1e-6;
    }),
    { numRuns: 200 }
  );
});

test('Contrast Invariants (PBT): relative luminance of arbitrary [r, g, b] array tuples is bounded in [0.0, 1.0] and not NaN', () => {
  fc.assert(
    fc.property(arrayTupleArbitrary, (tuple) => {
      const L = relativeLuminance(tuple);
      return !Number.isNaN(L) && L >= 0.0 && L <= 1.0 + 1e-6;
    }),
    { numRuns: 200 }
  );
});

test('Contrast Invariants (PBT): contrast ratio of arbitrary mixed color representations is bounded in [1.0, 21.0], never NaN, and symmetric', () => {
  fc.assert(
    fc.property(anyColorArbitrary, anyColorArbitrary, (c1, c2) => {
      const cr1 = calculateContrastRatio(c1, c2);
      const cr2 = calculateContrastRatio(c2, c1);
      const isNotNaN = !Number.isNaN(cr1) && !Number.isNaN(cr2);
      const isBounded = cr1 >= 1.0 - 1e-9 && cr1 <= 21.0 + 1e-9;
      const isSymmetric = Math.abs(cr1 - cr2) < 1e-9;
      return isNotNaN && isBounded && isSymmetric;
    }),
    { numRuns: 200 }
  );
});
