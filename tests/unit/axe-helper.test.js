import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAxeBuilder,
  makeAxe,
  formatIncompleteDiagnostics,
  NORMATIVE_TAGS,
  EXPLICIT_RULES,
  relativeLuminance,
  calculateContrastRatio,
  meetsContrastEnhanced
} from '../e2e/helpers/axe-helper.js';

test('AxeHelper: NORMATIVE_TAGS contains all WCAG 2.0, 2.1, 2.2 tags including wcag2aaa', () => {
  const expectedTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'];
  assert.deepEqual(NORMATIVE_TAGS, expectedTags);
});

test('AxeHelper: EXPLICIT_RULES explicitly targets target-size and color-contrast-enhanced', () => {
  assert.deepEqual(EXPLICIT_RULES, ['target-size', 'color-contrast-enhanced']);
});

test('AxeHelper: createAxeBuilder configures normative tags and explicit rules without restrictive include/exclude', () => {
  const mockPage = {};
  const builder = createAxeBuilder(mockPage);

  assert.ok(builder, 'Builder must be instantiated');
  assert.deepEqual(builder.option.runOnly, {
    type: 'tag',
    values: NORMATIVE_TAGS
  });
  assert.equal(builder.option.rules['color-contrast-enhanced'].enabled, true);
  assert.equal(builder.option.rules['target-size'].enabled, true);
  assert.deepEqual(builder.includes, []);
  assert.deepEqual(builder.excludes, []);
});

test('AxeHelper: makeAxe is a backward-compatible alias of createAxeBuilder', () => {
  assert.equal(makeAxe, createAxeBuilder);
});

test('AxeHelper: formatIncompleteDiagnostics returns empty array when input is empty or omitted per contracts §5.2', () => {
  assert.deepEqual(formatIncompleteDiagnostics([]), []);
  assert.deepEqual(formatIncompleteDiagnostics(), []);
});

test('AxeHelper: formatIncompleteDiagnostics returns array of projected nodes adhering to contracts §5.2', () => {
  const sampleIncomplete = [
    {
      id: 'color-contrast-enhanced',
      impact: 'serious',
      help: 'Elements must have sufficient color contrast',
      description: 'Ensure contrast meets AAA ratio',
      nodes: [
        { target: ['#player-controls', '.btn-prev'] },
        { target: ['#player-controls', '.btn-next'] }
      ]
    },
    {
      id: 'target-size',
      impact: 'moderate',
      help: 'Touch targets must be sufficiently large',
      description: 'Ensure touch targets >= 44px',
      nodes: [
        { target: ['#theme-selector'] }
      ]
    }
  ];

  let warnLogged = false;
  let tableLogged = false;
  const originalWarn = console.warn;
  const originalTable = console.table;

  try {
    console.warn = () => {
      warnLogged = true;
    };
    console.table = () => {
      tableLogged = true;
    };

    const result = formatIncompleteDiagnostics(sampleIncomplete);
    assert.ok(Array.isArray(result), 'Result must be an Array adhering to contracts §5.2');
    assert.equal(warnLogged, true, 'console.warn must be called for incomplete checks');
    assert.equal(tableLogged, true, 'console.table must be called for incomplete checks');
    assert.equal(result.length, 3, 'Must project each node individually via flatMap');
    assert.deepEqual(result, [
      {
        id: 'color-contrast-enhanced',
        impact: 'serious',
        help: 'Elements must have sufficient color contrast',
        target: '#player-controls, .btn-prev'
      },
      {
        id: 'color-contrast-enhanced',
        impact: 'serious',
        help: 'Elements must have sufficient color contrast',
        target: '#player-controls, .btn-next'
      },
      {
        id: 'target-size',
        impact: 'moderate',
        help: 'Touch targets must be sufficiently large',
        target: '#theme-selector'
      }
    ]);
  } finally {
    console.warn = originalWarn;
    console.table = originalTable;
  }
});

test('AxeHelper: formatIncompleteDiagnostics handles fallbacks for missing impact and help per contracts §5.2', () => {
  const incompleteWithFallbacks = [
    {
      id: 'custom-rule',
      description: 'Fallback description when help is absent',
      nodes: [
        { target: ['#custom-element'] }
      ]
    }
  ];

  const originalWarn = console.warn;
  const originalTable = console.table;
  try {
    console.warn = () => {};
    console.table = () => {};

    const result = formatIncompleteDiagnostics(incompleteWithFallbacks);
    assert.ok(Array.isArray(result), 'Result must be an Array');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'custom-rule');
    assert.equal(result[0].impact, 'unspecified', 'Impact must fallback to unspecified');
    assert.equal(result[0].help, 'Fallback description when help is absent', 'Help must fallback to description');
    assert.equal(result[0].target, '#custom-element');
  } finally {
    console.warn = originalWarn;
    console.table = originalTable;
  }
});

test('AxeHelper: relativeLuminance returns standard WCAG bounds [0, 1]', () => {
  const black = relativeLuminance({ r: 0, g: 0, b: 0 });
  const white = relativeLuminance({ r: 255, g: 255, b: 255 });

  assert.equal(black, 0);
  assert.ok(Math.abs(white - 1.0) < 1e-4);
});

test('AxeHelper: calculateContrastRatio computes 21:1 for black on white', () => {
  const cr = calculateContrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(cr - 21.0) < 0.01);
});

test('AxeHelper: meetsContrastEnhanced supports numeric contrast ratio signature (contrastRatioNumber, isLargeText)', () => {
  assert.equal(meetsContrastEnhanced(7.0), true, '>= 7.0:1 passes normal text by default');
  assert.equal(meetsContrastEnhanced(6.99), false, '< 7.0:1 fails normal text by default');
  assert.equal(meetsContrastEnhanced(7.0, false), true, '>= 7.0:1 passes normal text');
  assert.equal(meetsContrastEnhanced(6.99, false), false, '< 7.0:1 fails normal text');
  assert.equal(meetsContrastEnhanced(4.5, true), true, '>= 4.5:1 passes large text');
  assert.equal(meetsContrastEnhanced(4.49, true), false, '< 4.5:1 fails large text');
});

test('AxeHelper: meetsContrastEnhanced supports polymorphic color object signature (foregroundColor, backgroundColor, isLargeText)', () => {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  const midGray = { r: 118, g: 118, b: 118 }; // ~4.56:1 contrast with white
  const lightGray = { r: 200, g: 200, b: 200 }; // ~1.67:1 contrast with white

  // Black on white (21:1) passes both normal and large text
  assert.equal(meetsContrastEnhanced(black, white), true, 'Black on white passes normal text by default');
  assert.equal(meetsContrastEnhanced(black, white, false), true, 'Black on white passes normal text');
  assert.equal(meetsContrastEnhanced(black, white, true), true, 'Black on white passes large text');

  // Mid gray on white (~4.56:1) passes large text (>= 4.5), but fails normal text (< 7.0)
  assert.equal(meetsContrastEnhanced(midGray, white, false), false, 'Mid gray on white must fail normal text (< 7.0:1)');
  assert.equal(meetsContrastEnhanced(midGray, white, true), true, 'Mid gray on white must pass large text (>= 4.5:1)');

  // Light gray on white (~1.67:1) fails both
  assert.equal(meetsContrastEnhanced(lightGray, white, false), false, 'Light gray on white must fail normal text');
  assert.equal(meetsContrastEnhanced(lightGray, white, true), false, 'Light gray on white must fail large text');
});

test('AxeHelper: meetsContrastEnhanced supports polymorphic color string signature (foregroundColor, backgroundColor, isLargeText)', () => {
  // Hex color strings
  assert.equal(meetsContrastEnhanced('#000000', '#ffffff'), true, '#000000 on #ffffff passes normal text by default');
  assert.equal(meetsContrastEnhanced('#000000', '#ffffff', false), true, '#000000 on #ffffff passes normal text');
  assert.equal(meetsContrastEnhanced('#000000', '#ffffff', true), true, '#000000 on #ffffff passes large text');
  assert.equal(meetsContrastEnhanced('#ffffff', '#ffffff'), false, '#ffffff on #ffffff (1:1) must fail normal text');

  // Mid gray hex (#767676 on #ffffff has ~4.54:1 contrast)
  assert.equal(meetsContrastEnhanced('#767676', '#ffffff', false), false, '#767676 on #ffffff must fail normal text');
  assert.equal(meetsContrastEnhanced('#767676', '#ffffff', true), true, '#767676 on #ffffff must pass large text');

  // RGB color strings
  assert.equal(meetsContrastEnhanced('rgb(0, 0, 0)', 'rgb(255, 255, 255)'), true, 'rgb(0, 0, 0) on rgb(255, 255, 255) passes');
  assert.equal(meetsContrastEnhanced('rgb(200, 200, 200)', 'rgb(255, 255, 255)'), false, 'rgb(200, 200, 200) on rgb(255, 255, 255) fails');
});

test('AxeHelper: relativeLuminance accepts string (#hex, rgb()) and [r, g, b] array tuple inputs', () => {
  assert.ok(Math.abs(relativeLuminance('#ffffff') - 1.0) < 1e-4, '#ffffff returns ~1.0');
  assert.equal(relativeLuminance('#000000'), 0.0, '#000000 returns 0.0');
  assert.ok(Math.abs(relativeLuminance('rgb(255, 255, 255)') - 1.0) < 1e-4, 'rgb(255, 255, 255) returns ~1.0');
  assert.ok(Math.abs(relativeLuminance([255, 255, 255]) - 1.0) < 1e-4, '[255, 255, 255] returns ~1.0');
  assert.equal(relativeLuminance([0, 0, 0]), 0.0, '[0, 0, 0] returns 0.0');
});

test('AxeHelper: calculateContrastRatio accepts string (#hex, rgb()) and [r, g, b] array tuple inputs', () => {
  assert.ok(Math.abs(calculateContrastRatio('#000000', '#ffffff') - 21.0) < 0.01, '#000000 and #ffffff returns ~21.0');
  assert.ok(Math.abs(calculateContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)') - 21.0) < 0.01, 'rgb(0, 0, 0) and rgb(255, 255, 255) returns ~21.0');
  assert.ok(Math.abs(calculateContrastRatio([0, 0, 0], [255, 255, 255]) - 21.0) < 0.01, '[0, 0, 0] and [255, 255, 255] returns ~21.0');
});
