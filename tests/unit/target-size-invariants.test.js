import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { evaluateTargetSizes, EPSILON } from '../e2e/helpers/target-size-helper.js';

test('TargetSize Invariants (PBT): all bounding boxes with width >= 44 and height >= 44 inside viewport are AAA compliant', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        x: fc.double({ min: 0, max: 500, noNaN: true }),
        y: fc.double({ min: 0, max: 300, noNaN: true }),
        width: fc.double({ min: 44.0, max: 300.0, noNaN: true }),
        height: fc.double({ min: 44.0, max: 200.0, noNaN: true })
      }),
      async (box) => {
        const mockPage = {
          viewportSize: () => ({ width: 1280, height: 720 }),
          mouse: { move: async () => {} },
          evaluate: async (fn, arg) => {
            if (typeof fn === 'function' && !arg) return;
            return [{ id: 'pbt-ctrl', selector: '#pbt-ctrl', box }];
          }
        };

        const result = await evaluateTargetSizes(mockPage);
        return result.isCompliantAAA === true && result.compliantCount === 1 && result.nonCompliantCount === 0;
      }
    ),
    { numRuns: 100 }
  );
});

test('TargetSize Invariants (PBT): any control with dimension strictly below 44 - EPSILON is non-compliant', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.oneof(
        // Sub-threshold width
        fc.record({
          x: fc.constant(10),
          y: fc.constant(10),
          width: fc.double({ min: 1.0, max: 43.9, noNaN: true }),
          height: fc.double({ min: 44.0, max: 100.0, noNaN: true })
        }),
        // Sub-threshold height
        fc.record({
          x: fc.constant(10),
          y: fc.constant(10),
          width: fc.double({ min: 44.0, max: 100.0, noNaN: true }),
          height: fc.double({ min: 1.0, max: 43.9, noNaN: true })
        })
      ),
      async (box) => {
        const mockPage = {
          viewportSize: () => ({ width: 1280, height: 720 }),
          mouse: { move: async () => {} },
          evaluate: async (fn, arg) => {
            if (typeof fn === 'function' && !arg) return;
            return [{ id: 'pbt-fail-ctrl', selector: '#pbt-fail-ctrl', box }];
          }
        };

        const result = await evaluateTargetSizes(mockPage);
        return result.isCompliantAAA === false && result.nonCompliantCount === 1 && result.compliantCount === 0;
      }
    ),
    { numRuns: 100 }
  );
});

test('TargetSize Invariants (PBT): subpixel tolerance window [44 - EPSILON, 44] always yields compliance', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.double({ min: 44 - EPSILON, max: 44.0, noNaN: true }),
      fc.double({ min: 44 - EPSILON, max: 44.0, noNaN: true }),
      async (w, h) => {
        const mockPage = {
          viewportSize: () => ({ width: 1280, height: 720 }),
          mouse: { move: async () => {} },
          evaluate: async (fn, arg) => {
            if (typeof fn === 'function' && !arg) return;
            return [{ id: 'pbt-subpixel', selector: '#pbt-subpixel', box: { x: 10, y: 10, width: w, height: h } }];
          }
        };

        const result = await evaluateTargetSizes(mockPage);
        return result.isCompliantAAA === true;
      }
    ),
    { numRuns: 50 }
  );
});

test('TargetSize Invariants (PBT): smallestTarget area invariant', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          selector: fc.constant('#ctrl'),
          box: fc.record({
            x: fc.constant(10),
            y: fc.constant(10),
            width: fc.double({ min: 44.0, max: 100.0, noNaN: true }),
            height: fc.double({ min: 44.0, max: 100.0, noNaN: true })
          })
        }),
        { minLength: 1, maxLength: 10 }
      ),
      async (controls) => {
        const mockPage = {
          viewportSize: () => ({ width: 1280, height: 720 }),
          mouse: { move: async () => {} },
          evaluate: async (fn, arg) => {
            if (typeof fn === 'function' && !arg) return;
            return controls;
          }
        };

        const result = await evaluateTargetSizes(mockPage);
        assert.ok(result.smallestTarget !== null);
        const smallestArea = result.smallestTarget.width * result.smallestTarget.height;
        for (const c of controls) {
          const area = c.box.width * c.box.height;
          // Account for 0.1 rounding of smallestTarget width and height
          assert.ok(
            smallestArea <= area + 10.0,
            `Smallest target (${smallestArea}) must be <= control area (${area})`
          );
        }
        return true;
      }
    ),
    { numRuns: 50 }
  );
});
