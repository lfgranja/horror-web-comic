import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTargetSizes, EPSILON, INTERACTIVE_TARGET_SELECTOR } from '../e2e/helpers/target-size-helper.js';

test('TargetSizeHelper: exports EPSILON = 0.05 and normative selector list', () => {
  assert.equal(EPSILON, 0.05);
  assert.ok(INTERACTIVE_TARGET_SELECTOR.includes('button'));
  assert.ok(INTERACTIVE_TARGET_SELECTOR.includes('[role="button"]'));
  assert.ok(INTERACTIVE_TARGET_SELECTOR.includes('a[href]'));
  assert.ok(
    INTERACTIVE_TARGET_SELECTOR.includes('[tabindex="0"]'),
    'Selector must include [tabindex="0"] per FR-005 and contract §5.3'
  );
});

test('TargetSizeHelper: returns compliant evaluation when all controls are >= 44x44px', async () => {
  const mockPage = {
    viewportSize: () => ({ width: 1280, height: 720 }),
    mouse: { move: async () => {} },
    evaluate: async (fn, arg) => {
      if (typeof fn === 'function' && !arg) {
        // Animation stabilization step
        return;
      }
      // Candidates evaluation step
      return [
        {
          id: 'btn-play',
          selector: '#btn-play',
          box: { x: 10, y: 10, width: 44, height: 44 }
        },
        {
          id: 'btn-pause',
          selector: '#btn-pause',
          box: { x: 60, y: 10, width: 48, height: 48 }
        }
      ];
    }
  };

  const evaluation = await evaluateTargetSizes(mockPage, 'nav.control-bar');
  assert.equal(evaluation.tested, true);
  assert.equal(evaluation.status, 'pass');
  assert.equal(evaluation.isCompliantAAA, true);
  assert.equal(evaluation.compliantCount, 2);
  assert.equal(evaluation.nonCompliantCount, 0);
  assert.equal(evaluation.smallestTarget.id, 'btn-play');
  assert.equal(evaluation.smallestTarget.width, 44);
});

test('TargetSizeHelper: respects EPSILON subpixel tolerance (43.96px passes >= 44 - 0.05)', async () => {
  const mockPage = {
    viewportSize: () => ({ width: 1280, height: 720 }),
    mouse: { move: async () => {} },
    evaluate: async (fn, arg) => {
      if (typeof fn === 'function' && !arg) return;
      return [
        {
          id: 'subpixel-btn',
          selector: '#subpixel-btn',
          box: { x: 10, y: 10, width: 43.96, height: 44 }
        }
      ];
    }
  };

  const evaluation = await evaluateTargetSizes(mockPage);
  assert.equal(evaluation.isCompliantAAA, true, '43.96px must pass with EPSILON = 0.05');
  assert.equal(evaluation.compliantCount, 1);
});

test('TargetSizeHelper: fails compliance when control dimension is below 44px threshold', async () => {
  const mockPage = {
    viewportSize: () => ({ width: 1280, height: 720 }),
    mouse: { move: async () => {} },
    evaluate: async (fn, arg) => {
      if (typeof fn === 'function' && !arg) return;
      return [
        {
          id: 'small-icon-btn',
          selector: '#small-icon-btn',
          box: { x: 10, y: 10, width: 32, height: 32 }
        }
      ];
    }
  };

  const evaluation = await evaluateTargetSizes(mockPage);
  assert.equal(evaluation.isCompliantAAA, false, '32x32px control must fail AAA target size requirement');
  assert.equal(evaluation.status, 'fail');
  assert.equal(evaluation.compliantCount, 0);
  assert.equal(evaluation.nonCompliantCount, 1);
});

test('TargetSizeHelper: handles empty container returning tested: false and compliant default', async () => {
  const mockPage = {
    viewportSize: () => ({ width: 1280, height: 720 }),
    mouse: { move: async () => {} },
    evaluate: async (fn, arg) => {
      if (typeof fn === 'function' && !arg) return;
      return [];
    }
  };

  const evaluation = await evaluateTargetSizes(mockPage, '#empty-container');
  assert.equal(evaluation.tested, false);
  assert.equal(evaluation.status, 'pass');
  assert.equal(evaluation.isCompliantAAA, true);
  assert.equal(evaluation.compliantCount, 0);
  assert.equal(evaluation.nonCompliantCount, 0);
  assert.equal(evaluation.smallestTarget, null);
});

test('TargetSizeHelper: detects controls positioned outside active viewport boundaries', async () => {
  const mockPage = {
    viewportSize: () => ({ width: 1280, height: 720 }),
    mouse: { move: async () => {} },
    evaluate: async (fn, arg) => {
      if (typeof fn === 'function' && !arg) return;
      return [
        {
          id: 'offscreen-btn',
          selector: '#offscreen-btn',
          box: { x: 1300, y: 10, width: 48, height: 48 }
        }
      ];
    }
  };

  const evaluation = await evaluateTargetSizes(mockPage);
  assert.equal(evaluation.isCompliantAAA, false, 'Offscreen control must fail compliance');
  assert.equal(evaluation.nonCompliantCount, 1);
});

test('TargetSizeHelper: includes [tabindex="0"] elements within interactive containers in target size evaluation per FR-005 and Contracts §5.3', async () => {
  let capturedSelector = null;
  let capturedContainerSel = null;

  const mockPage = {
    viewportSize: () => ({ width: 1280, height: 720 }),
    mouse: { move: async () => {} },
    evaluate: async (fn, arg) => {
      if (typeof fn === 'function' && !arg) return;
      capturedSelector = arg?.selector;
      capturedContainerSel = arg?.containerSel;
      return [
        {
          id: 'focusable-card',
          selector: '.overlay:not([hidden]) [tabindex="0"]',
          box: { x: 40, y: 40, width: 44, height: 44 }
        }
      ];
    }
  };

  const evaluation = await evaluateTargetSizes(mockPage, '.overlay:not([hidden])');
  assert.equal(capturedContainerSel, '.overlay:not([hidden])');
  assert.ok(
    capturedSelector && capturedSelector.includes('[tabindex="0"]'),
    'Target evaluation query selector passed to page.evaluate must include [tabindex="0"]'
  );
  assert.equal(evaluation.tested, true);
  assert.equal(evaluation.status, 'pass');
  assert.equal(evaluation.isCompliantAAA, true);
  assert.equal(evaluation.compliantCount, 1);
  assert.equal(evaluation.nonCompliantCount, 0);
  assert.equal(evaluation.controls[0].id, 'focusable-card');
  assert.equal(evaluation.controls[0].isCompliant, true);
});

test('TargetSizeHelper: fails compliance when [tabindex="0"] interactive target in container is smaller than 44x44px', async () => {
  const mockPage = {
    viewportSize: () => ({ width: 1280, height: 720 }),
    mouse: { move: async () => {} },
    evaluate: async (fn, arg) => {
      if (typeof fn === 'function' && !arg) return;
      return [
        {
          id: 'small-tabindex-target',
          selector: '.overlay:not([hidden]) [tabindex="0"]',
          box: { x: 40, y: 40, width: 36, height: 36 }
        }
      ];
    }
  };

  const evaluation = await evaluateTargetSizes(mockPage, '.overlay:not([hidden])');
  assert.equal(evaluation.tested, true);
  assert.equal(evaluation.status, 'fail');
  assert.equal(evaluation.isCompliantAAA, false);
  assert.equal(evaluation.compliantCount, 0);
  assert.equal(evaluation.nonCompliantCount, 1);
  assert.equal(evaluation.controls[0].isCompliant, false);
});

test('TargetSizeHelper: records failure cleanly without crashing when bounding box is null or detached', async () => {
  const mockPage = {
    viewportSize: () => ({ width: 1280, height: 720 }),
    mouse: { move: async () => {} },
    evaluate: async (fn, arg) => {
      if (typeof fn === 'function' && !arg) return;
      return [
        {
          id: 'null-box-btn',
          selector: '#null-box-btn',
          box: null
        },
        {
          id: 'valid-btn',
          selector: '#valid-btn',
          box: { x: 10, y: 10, width: 48, height: 48 }
        }
      ];
    }
  };

  let evaluation;
  await assert.doesNotReject(async () => {
    evaluation = await evaluateTargetSizes(mockPage);
  }, 'evaluateTargetSizes must not crash when candidate has null bounding box');

  assert.equal(evaluation.tested, true);
  assert.equal(evaluation.status, 'fail');
  assert.equal(evaluation.isCompliantAAA, false);
  assert.equal(evaluation.tier1Status, 'fail');
  assert.equal(evaluation.tier2Status, 'fail');
  assert.equal(evaluation.compliantCount, 1);
  assert.equal(evaluation.nonCompliantCount, 1);

  const nullControl = evaluation.controls.find((c) => c.id === 'null-box-btn');
  assert.ok(nullControl, 'Evaluation controls array must retain the null-box element');
  assert.equal(nullControl.isCompliant, false);
  assert.equal(nullControl.width, 0);
  assert.equal(nullControl.height, 0);
  assert.deepEqual(nullControl.box, { x: 0, y: 0, width: 0, height: 0 });
});
