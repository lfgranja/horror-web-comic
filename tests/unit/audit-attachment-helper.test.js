import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import * as auditHelper from '../e2e/helpers/audit-attachment-helper.js';

const {
  attachAuditArtifacts,
  captureFailureArtifacts,
  AUDIT_SCOPE_ANNOTATION,
  AUDIT_LEGAL_DISCLAIMER,
  MAX_NODES_PER_RULE,
  formatAuditSummaryMarkdown
} = auditHelper;

const AUDIT_SCHEMA_PATH = resolve('specs/004-wcag-aaa-audit-pipeline/contracts/audit-report.schema.json');
const auditSchema = JSON.parse(readFileSync(AUDIT_SCHEMA_PATH, 'utf-8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateAudit = ajv.compile(auditSchema);

function createMockTestInfo(projectName = 'desktop-chromium') {
  const attachments = [];
  const annotations = [];
  return {
    project: {
      name: projectName,
      use: { viewport: { width: 1280, height: 720 } }
    },
    annotations,
    attachments,
    attach: async (name, { body, contentType }) => {
      attachments.push({ name, body, contentType });
    },
    status: 'passed',
    expectedStatus: 'passed'
  };
}

/**
 * Validates markdown table structural delimiter balance:
 * - Every table row begins and ends with '|'
 * - Every row in a table block has matching pipe count
 * - Every table block contains a delimiter row |---|
 */
function assertTableDelimiterBalance(markdown) {
  const lines = markdown.split('\n');
  let inTable = false;
  let expectedPipes = null;
  let tableHeaderFound = false;
  let tableSeparatorFound = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const trimmed = lines[idx].trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const pipeCount = (trimmed.match(/\|/g) || []).length;
      if (!inTable) {
        inTable = true;
        expectedPipes = pipeCount;
        tableHeaderFound = true;
        tableSeparatorFound = false;
      } else {
        assert.equal(
          pipeCount,
          expectedPipes,
          `Table row at line ${idx + 1} has ${pipeCount} pipes, expected ${expectedPipes}: "${trimmed}"`
        );
        if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed)) {
          tableSeparatorFound = true;
        }
      }
    } else {
      if (inTable) {
        assert.ok(tableHeaderFound, 'Table header must be present');
        assert.ok(tableSeparatorFound, 'Table separator row (|---|) must be present in table block');
        inTable = false;
        expectedPipes = null;
        tableHeaderFound = false;
        tableSeparatorFound = false;
      }
    }
  }

  if (inTable) {
    assert.ok(tableSeparatorFound, 'Table separator row (|---|) must be present in table block');
  }
}

// Fast-check arbitraries for non-empty violation trees and incomplete diagnostics
const safeIdArbitrary = fc.constantFrom(
  'color-contrast-enhanced',
  'target-size',
  'aria-valid-attr',
  'button-name',
  'image-alt'
);

const impactArbitrary = fc.constantFrom('minor', 'moderate', 'serious', 'critical');

const axeCheckArbitrary = fc.record({
  id: safeIdArbitrary,
  message: fc.string({ minLength: 1, maxLength: 40 }),
  data: fc.constant({ fgColor: '#ffffff', bgColor: '#000000', contrastRatio: 21 })
});

const axeNodeArbitrary = fc.record({
  target: fc.array(
    fc.constantFrom('#player', '.control-button', 'button#resume-btn', 'main', '#frame-desc'),
    { minLength: 1, maxLength: 3 }
  ),
  html: fc.constantFrom(
    '<button id="resume-btn" class="btn">Resume</button>',
    '<div id="player" class="active">Player Frame</div>',
    '<span class="sr-only">Live Status</span>',
    '<p id="frame-desc">A dark corridor opens ahead...</p>'
  ),
  failureSummary: fc.constantFrom(
    'Fix any of the following: element has insufficient color contrast (expected >= 7:1)',
    'Target size is too small (40x40px, needs >= 44x44px)',
    'Element has no accessible name'
  ),
  // Include raw check tree that must be stripped in serialized payload
  any: fc.array(axeCheckArbitrary, { minLength: 0, maxLength: 2 }),
  all: fc.array(axeCheckArbitrary, { minLength: 0, maxLength: 2 }),
  none: fc.array(axeCheckArbitrary, { minLength: 0, maxLength: 2 })
});

const violationArbitrary = fc.record({
  id: safeIdArbitrary,
  impact: impactArbitrary,
  description: fc.constantFrom(
    'Ensures the contrast between foreground and background colors meets WCAG 2 AAA thresholds',
    'Ensures touch targets have sufficient size for motor impairment accessibility',
    'Ensures buttons have discernible text'
  ),
  help: fc.constantFrom(
    'Elements must have sufficient color contrast (>= 7:1)',
    'Interactive elements must be at least 44 by 44 pixels',
    'Buttons must have discernible text'
  ),
  helpUrl: fc.constantFrom(
    'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
    'https://dequeuniversity.com/rules/axe/4.13/target-size',
    'https://dequeuniversity.com/rules/axe/4.13/button-name'
  ),
  tags: fc.subarray(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag146', 'wcag255'], { minLength: 1 }),
  nodes: fc.array(axeNodeArbitrary, { minLength: 1, maxLength: 15 })
});

const incompleteArbitrary = fc.record({
  id: safeIdArbitrary,
  impact: fc.oneof(impactArbitrary, fc.constant(null)),
  description: fc.constantFrom(
    'Element has background image or gradient; manual contrast check required',
    'Element visibility depends on script execution'
  ),
  help: fc.constantFrom(
    'Verify color contrast against complex background',
    'Confirm target size under dynamic layout'
  ),
  helpUrl: fc.constantFrom(
    'https://dequeuniversity.com/rules/axe/4.13/color-contrast',
    'https://dequeuniversity.com/rules/axe/4.13/target-size'
  ),
  tags: fc.subarray(['wcag2aaa', 'cat.color'], { minLength: 1 }),
  nodes: fc.array(
    fc.record({
      target: fc.array(fc.constantFrom('#overlay', '.backdrop', '#bg-img'), { minLength: 1, maxLength: 2 }),
      html: fc.constantFrom('<div class="backdrop"></div>', '<canvas id="bg"></canvas>'),
      failureSummary: fc.constant('Requires visual verification'),
      any: fc.array(axeCheckArbitrary, { minLength: 0, maxLength: 2 }),
      all: fc.array(axeCheckArbitrary, { minLength: 0, maxLength: 2 }),
      none: fc.array(axeCheckArbitrary, { minLength: 0, maxLength: 2 })
    }),
    { minLength: 1, maxLength: 15 }
  )
});

// Existing unit tests
test('AuditAttachmentHelper: attachAuditArtifacts appends formal audit scope annotation', async () => {
  const testInfo = createMockTestInfo();
  await attachAuditArtifacts(testInfo, { passes: [], violations: [], incomplete: [], inapplicable: [] }, 'cinema', 'resting');

  const annotation = testInfo.annotations.find((a) => a.type === 'audit_scope');
  assert.ok(annotation, 'audit_scope annotation must be appended');
  assert.equal(annotation.description, AUDIT_SCOPE_ANNOTATION);
});

test('AuditAttachmentHelper: attachAuditArtifacts attaches both JSON and Markdown artifacts', async () => {
  const testInfo = createMockTestInfo();
  const sampleResults = {
    passes: [{ id: 'aria-valid' }],
    violations: [],
    incomplete: [],
    inapplicable: [{ id: 'button-name' }]
  };

  const payload = await attachAuditArtifacts(testInfo, sampleResults, 'noir', 'dynamic-traversal');

  assert.equal(testInfo.attachments.length, 2);
  const jsonAttachment = testInfo.attachments.find((a) => a.name.endsWith('.json'));
  const mdAttachment = testInfo.attachments.find((a) => a.name.endsWith('.md'));

  assert.ok(jsonAttachment, 'JSON artifact must be attached');
  assert.ok(mdAttachment, 'Markdown summary must be attached');
  assert.equal(jsonAttachment.contentType, 'application/json');
  assert.equal(mdAttachment.contentType, 'text/markdown');

  // Verify passes and inapplicable raw nodes are stripped; only counts retained
  assert.equal(payload.metrics.passesCount, 1);
  assert.equal(payload.metrics.inapplicableCount, 1);
  assert.equal(payload.passes, undefined);
  assert.equal(payload.inapplicable, undefined);
});

test('AuditAttachmentHelper: enforces budget limit <= 50 KB for JSON payload', async () => {
  const testInfo = createMockTestInfo();
  // Create massive violations that breach 50 KB
  const massiveViolations = Array.from({ length: 300 }, (_, idx) => ({
    id: `rule-${idx}`,
    impact: 'serious',
    description: 'X'.repeat(300),
    help: 'Fix this rule',
    helpUrl: 'https://example.com',
    tags: ['wcag2aaa'],
    nodes: Array.from({ length: 5 }, () => ({
      target: ['#very-long-selector-breaching-limits'],
      html: '<div class="huge">Content</div>'.repeat(10),
      failureSummary: 'Fix it'
    }))
  }));

  await assert.rejects(
    async () => {
      await attachAuditArtifacts(testInfo, { violations: massiveViolations }, 'cinema', 'resting');
    },
    /exceeds maximum ceiling of 50 KB/
  );
});

test('AuditAttachmentHelper: captureFailureArtifacts executes defensively without throwing on TargetClosedError', async () => {
  const testInfo = createMockTestInfo();
  testInfo.status = 'failed';
  testInfo.expectedStatus = 'passed';

  const mockCrashingPage = {
    content: async () => {
      throw new Error('TargetClosedError: Browser closed unexpectedly');
    },
    screenshot: async () => {
      throw new Error('TargetClosedError');
    },
    evaluate: async () => {
      throw new Error('TargetClosedError');
    },
    url: () => 'http://127.0.0.1:8080/'
  };

  // Must not throw despite page methods failing
  await captureFailureArtifacts(testInfo, mockCrashingPage, 'interactive-audio', 'cinema');
  assert.ok(testInfo.attachments.length >= 1, 'At least DOM fallback attachment should be created');
});

test('Property-Based Invariant: attachAuditArtifacts JSON payload survives parse-stringify roundtrip', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('cinema', 'noir', 'eldritch', 'industrial', 'shadow-props'),
      fc.constantFrom('resting', 'dynamic-traversal', 'interactive-audio', 'end-state'),
      fc.integer({ min: 0, max: 50 }),
      async (theme, state, durationMs) => {
        const testInfo = createMockTestInfo();
        const payload = await attachAuditArtifacts(
          testInfo,
          { passes: [], violations: [], incomplete: [], inapplicable: [] },
          theme,
          state,
          null,
          durationMs
        );

        const serialized = JSON.stringify(payload);
        const roundtripped = JSON.parse(serialized);
        assert.deepEqual(roundtripped, payload);
        assert.ok(Buffer.byteLength(serialized, 'utf-8') <= 50 * 1024);
        return true;
      }
    ),
    { numRuns: 30 }
  );
});

// T033: Unit tests for deterministic node truncation with MAX_NODES_PER_RULE = 10
test('AuditAttachmentHelper (T033): exports MAX_NODES_PER_RULE constant equal to 10', () => {
  assert.equal(MAX_NODES_PER_RULE, 10, 'MAX_NODES_PER_RULE must be defined and equal to 10');
});

test('AuditAttachmentHelper (T033): deterministic node truncation with MAX_NODES_PER_RULE = 10 for violations', async () => {
  const testInfo = createMockTestInfo();
  // 15 nodes (> 10)
  const fifteenNodes = Array.from({ length: 15 }, (_, i) => ({
    target: [`#node-${i}`],
    html: `<div id="node-${i}">Node ${i}</div>`,
    failureSummary: `Fix contrast for node ${i}`
  }));

  const sampleResults = {
    passes: [],
    violations: [
      {
        id: 'color-contrast-enhanced',
        impact: 'serious',
        description: 'Insufficient contrast',
        help: 'Elements must have >= 7:1 contrast',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
        tags: ['wcag2aaa'],
        nodes: fifteenNodes
      }
    ],
    incomplete: [],
    inapplicable: []
  };

  const payload = await attachAuditArtifacts(testInfo, sampleResults, 'cinema', 'resting');
  const violation = payload.violations[0];

  assert.equal(violation.nodes.length, 10, 'Must truncate nodes array to 10');
  assert.equal(violation.truncated, true, 'Must set truncated: true when nodes > 10');
  assert.equal(violation.totalNodes, 15, 'Must set totalNodes to original count of 15');
});

test('AuditAttachmentHelper (T033): deterministic node truncation omits truncated and totalNodes when nodes <= 10 for violations', async () => {
  const testInfo = createMockTestInfo();
  const tenNodes = Array.from({ length: 10 }, (_, i) => ({
    target: [`#node-${i}`],
    html: `<div id="node-${i}">Node ${i}</div>`,
    failureSummary: `Fix contrast for node ${i}`
  }));
  const threeNodes = Array.from({ length: 3 }, (_, i) => ({
    target: [`#small-${i}`],
    html: `<div id="small-${i}">Small ${i}</div>`,
    failureSummary: `Fix small node ${i}`
  }));

  const sampleResults = {
    passes: [],
    violations: [
      {
        id: 'color-contrast-enhanced',
        impact: 'serious',
        description: 'Insufficient contrast',
        help: 'Elements must have >= 7:1 contrast',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
        tags: ['wcag2aaa'],
        nodes: tenNodes
      },
      {
        id: 'target-size',
        impact: 'serious',
        description: 'Target size below 44px',
        help: 'Target size must be >= 44x44px',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/target-size',
        tags: ['wcag2aaa'],
        nodes: threeNodes
      }
    ],
    incomplete: [],
    inapplicable: []
  };

  const payload = await attachAuditArtifacts(testInfo, sampleResults, 'noir', 'resting');

  assert.equal(payload.violations[0].nodes.length, 10);
  assert.equal(payload.violations[0].truncated, undefined, 'truncated must be undefined when nodes <= 10');
  assert.equal(payload.violations[0].totalNodes, undefined, 'totalNodes must be undefined when nodes <= 10');

  assert.equal(payload.violations[1].nodes.length, 3);
  assert.equal(payload.violations[1].truncated, undefined, 'truncated must be undefined when nodes <= 10');
  assert.equal(payload.violations[1].totalNodes, undefined, 'totalNodes must be undefined when nodes <= 10');
});

test('AuditAttachmentHelper (T033): deterministic node truncation with MAX_NODES_PER_RULE = 10 for incomplete', async () => {
  const testInfo = createMockTestInfo();
  const fourteenNodes = Array.from({ length: 14 }, (_, i) => ({
    target: [`#inc-node-${i}`],
    html: `<div id="inc-node-${i}">Incomplete ${i}</div>`,
    failureSummary: `Manual review needed for ${i}`
  }));

  const sampleResults = {
    passes: [],
    violations: [],
    incomplete: [
      {
        id: 'color-contrast',
        impact: 'moderate',
        description: 'Color contrast inconclusive',
        help: 'Check manually',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast',
        tags: ['wcag2aaa'],
        nodes: fourteenNodes
      }
    ],
    inapplicable: []
  };

  const payload = await attachAuditArtifacts(testInfo, sampleResults, 'eldritch', 'resting');
  const inc = payload.incomplete[0];

  assert.equal(inc.nodes.length, 10, 'Must truncate incomplete nodes to 10');
  assert.equal(inc.truncated, true, 'Must set truncated: true on incomplete when nodes > 10');
  assert.equal(inc.totalNodes, 14, 'Must set totalNodes to original count of 14');
});

test('AuditAttachmentHelper (T033): deterministic node truncation omits truncated and totalNodes when incomplete nodes <= 10', async () => {
  const testInfo = createMockTestInfo();
  const fiveNodes = Array.from({ length: 5 }, (_, i) => ({
    target: [`#inc-${i}`],
    html: `<div>${i}</div>`
  }));

  const sampleResults = {
    passes: [],
    violations: [],
    incomplete: [
      {
        id: 'color-contrast',
        description: 'Color contrast inconclusive',
        nodes: fiveNodes
      }
    ],
    inapplicable: []
  };

  const payload = await attachAuditArtifacts(testInfo, sampleResults, 'industrial', 'resting');
  assert.equal(payload.incomplete[0].nodes.length, 5);
  assert.equal(payload.incomplete[0].truncated, undefined, 'truncated must be undefined on incomplete when nodes <= 10');
  assert.equal(payload.incomplete[0].totalNodes, undefined, 'totalNodes must be undefined on incomplete when nodes <= 10');
});

test('AuditAttachmentHelper (T033): preserves incomplete metadata (impact, help, helpUrl, tags) in serialized payload', async () => {
  const testInfo = createMockTestInfo();
  const sampleResults = {
    passes: [],
    violations: [],
    incomplete: [
      {
        id: 'color-contrast-enhanced',
        impact: 'serious',
        description: 'Element background cannot be determined due to gradient',
        help: 'Verify text contrast manually against the gradient background',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
        tags: ['wcag2aaa', 'wcag146', 'cat.color'],
        nodes: [
          {
            target: ['#hero-heading'],
            html: '<h1 id="hero-heading">Title</h1>',
            failureSummary: 'Cannot determine background color'
          }
        ]
      }
    ],
    inapplicable: []
  };

  const payload = await attachAuditArtifacts(testInfo, sampleResults, 'eldritch', 'resting');
  assert.equal(payload.incomplete.length, 1);
  const inc = payload.incomplete[0];
  assert.equal(inc.id, 'color-contrast-enhanced');
  assert.equal(inc.impact, 'serious', 'Incomplete impact must be preserved');
  assert.equal(inc.help, 'Verify text contrast manually against the gradient background', 'Incomplete help must be preserved');
  assert.equal(inc.helpUrl, 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced', 'Incomplete helpUrl must be preserved');
  assert.deepEqual(inc.tags, ['wcag2aaa', 'wcag146', 'cat.color'], 'Incomplete tags must be preserved');
  assert.equal(inc.description, 'Element background cannot be determined due to gradient');
});

test('AuditAttachmentHelper (T033): generated payloads from attachAuditArtifacts pass schema validation directly against audit-report.schema.json', async () => {
  const testInfo = createMockTestInfo();
  const sampleResults = {
    passes: [{ id: 'aria-valid' }],
    violations: [
      {
        id: 'color-contrast-enhanced',
        impact: 'critical',
        description: 'Text contrast must be >= 7:1',
        help: 'Ensure sufficient contrast',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
        tags: ['wcag2aaa', 'wcag146'],
        nodes: [
          {
            target: ['#title'],
            html: '<h1>Title</h1>',
            failureSummary: 'Contrast is 3:1'
          }
        ]
      }
    ],
    incomplete: [
      {
        id: 'color-contrast',
        impact: 'moderate',
        description: 'Complex gradient',
        help: 'Inspect manually',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast',
        tags: ['wcag2aaa'],
        nodes: [
          {
            target: ['#canvas-bg'],
            html: '<canvas id="canvas-bg"></canvas>'
          }
        ]
      }
    ],
    inapplicable: [{ id: 'button-name' }]
  };

  const targetSizeSummary = {
    tested: true,
    status: 'pass',
    tier1Status: 'pass',
    tier2Status: 'pass',
    compliantCount: 3,
    nonCompliantCount: 0,
    smallestTarget: { id: 'next-frame', width: 44, height: 44 },
    controls: [
      {
        selector: '#next-frame',
        id: 'next-frame',
        width: 44,
        height: 44,
        isCompliant: true,
        box: { x: 10, y: 10, width: 44, height: 44 }
      }
    ],
    isCompliantAAA: true
  };

  const payload = await attachAuditArtifacts(
    testInfo,
    sampleResults,
    'cinema',
    'interactive-audio',
    targetSizeSummary,
    125
  );

  const isValid = validateAudit(payload);
  assert.equal(
    isValid,
    true,
    `Payload must satisfy audit-report.schema.json: ${JSON.stringify(validateAudit.errors)}`
  );
});

// T032: Property-based tests for Markdown AST invariants and serialization fuzzing
test('Property-Based Invariant (T032): formatAuditSummaryMarkdown preserves normative header, sections, and table balance under fuzzing', () => {
  assert.equal(typeof formatAuditSummaryMarkdown, 'function', 'formatAuditSummaryMarkdown must be exported as a function');

  fc.assert(
    fc.property(
      fc.constantFrom('cinema', 'noir', 'eldritch', 'industrial', 'shadow-props'),
      fc.constantFrom('resting', 'dynamic-traversal', 'interactive-audio', 'end-state'),
      fc.array(violationArbitrary, { minLength: 0, maxLength: 5 }),
      fc.array(incompleteArbitrary, { minLength: 0, maxLength: 5 }),
      fc.integer({ min: 0, max: 10000 }),
      (theme, state, violations, incomplete, durationMs) => {
        const report = {
          metadata: {
            engine: '@axe-core/playwright',
            engineVersion: '4.13.0',
            playwrightVersion: '1.64.0',
            browser: 'desktop-chromium',
            viewport: { width: 1280, height: 720 },
            timestamp: new Date().toISOString(),
            classification: 'Machine-Verifiable Automated Regression Gate',
            targetStandard: 'W3C WCAG 2.2 (Automated Subset)',
            tags: ['wcag2aaa'],
            assertor: { type: 'earl:Software', name: '@axe-core/playwright', operator: 'CI/CD Pipeline' },
            disclaimer: AUDIT_LEGAL_DISCLAIMER
          },
          theme,
          state,
          metrics: {
            passesCount: 15,
            violationsCount: violations.length,
            incompleteCount: incomplete.length,
            inapplicableCount: 42,
            durationMs
          },
          violations,
          incomplete,
          targetSizeSummary: {
            tested: true,
            status: 'pass',
            tier1Status: 'pass',
            tier2Status: 'pass',
            compliantCount: 4,
            nonCompliantCount: 0,
            smallestTarget: { id: 'btn', width: 44, height: 44 },
            controls: [],
            isCompliantAAA: true
          }
        };

        const md = formatAuditSummaryMarkdown(report);

        // 1. Normative top-level header and sections per contracts/test-suite-api.md §6.2
        assert.ok(
          md.startsWith('# Relatório de Auditoria WCAG 2.2 AAA'),
          'Must start with normative header # Relatório de Auditoria WCAG 2.2 AAA'
        );
        assert.ok(md.includes('## 1. Métricas de Conformidade Axe-Core'), 'Must include section 1');
        assert.ok(md.includes('## 2. Avaliação de Alvos de Toque'), 'Must include section 2');
        assert.ok(md.includes('## 3. Detalhamento de Violações Confirmadas'), 'Must include section 3');
        assert.ok(md.includes('## 4. Diagnósticos Inconclusivos'), 'Must include section 4');

        // 2. Table delimiter balance
        assertTableDelimiterBalance(md);

        // 3. Payload byte size ceiling <= 10 KB
        const byteSize = Buffer.byteLength(md, 'utf-8');
        assert.ok(byteSize <= 10 * 1024, `Markdown size (${byteSize} B) must not exceed 10 KB`);

        return true;
      }
    ),
    { numRuns: 30 }
  );
});

test('Property-Based Invariant (T032): attachAuditArtifacts markdown summary preserves normative header and table delimiters under fuzzing', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('cinema', 'noir', 'eldritch', 'industrial', 'shadow-props'),
      fc.constantFrom('resting', 'dynamic-traversal', 'interactive-audio', 'end-state'),
      fc.array(violationArbitrary, { minLength: 0, maxLength: 5 }),
      fc.array(incompleteArbitrary, { minLength: 0, maxLength: 5 }),
      async (theme, state, violations, incomplete) => {
        const testInfo = createMockTestInfo();
        await attachAuditArtifacts(
          testInfo,
          { passes: [], violations, incomplete, inapplicable: [] },
          theme,
          state
        );

        const mdAttachment = testInfo.attachments.find((a) => a.name.endsWith('.md'));
        assert.ok(mdAttachment, 'Markdown artifact must exist');
        assert.equal(mdAttachment.contentType, 'text/markdown');

        const md = mdAttachment.body;
        assert.ok(
          md.startsWith('# Relatório de Auditoria WCAG 2.2 AAA'),
          `Markdown summary must start with normative header # Relatório de Auditoria WCAG 2.2 AAA, got: ${md.slice(0, 50)}`
        );
        assertTableDelimiterBalance(md);
        assert.ok(Buffer.byteLength(md, 'utf-8') <= 10 * 1024, 'Markdown artifact must be <= 10 KB');
        return true;
      }
    ),
    { numRuns: 20 }
  );
});

test('Property-Based Invariant (T032): serialization round-trip across randomized non-empty violation trees and incomplete diagnostics', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('cinema', 'noir', 'eldritch', 'industrial', 'shadow-props'),
      fc.constantFrom('resting', 'dynamic-traversal', 'interactive-audio', 'end-state'),
      fc.array(violationArbitrary, { minLength: 1, maxLength: 4 }),
      fc.array(incompleteArbitrary, { minLength: 1, maxLength: 4 }),
      fc.integer({ min: 1, max: 8000 }),
      async (theme, state, violations, incomplete, durationMs) => {
        const testInfo = createMockTestInfo();
        const payload = await attachAuditArtifacts(
          testInfo,
          {
            passes: [{ id: 'aria-valid' }],
            violations,
            incomplete,
            inapplicable: [{ id: 'skip-link' }]
          },
          theme,
          state,
          null,
          durationMs
        );

        // 1. Serialization round-trip invariance
        const serialized = JSON.stringify(payload);
        const roundtripped = JSON.parse(serialized);
        assert.deepEqual(roundtripped, payload, 'Payload must survive JSON serialize/parse roundtrip');

        // 2. Budget ceiling <= 50 KB
        const byteLength = Buffer.byteLength(serialized, 'utf-8');
        assert.ok(byteLength <= 50 * 1024, `JSON payload size (${byteLength} B) must not exceed 50 KB`);

        // 3. Raw check trees (any, all, none) stripped from nodes
        for (const v of payload.violations) {
          for (const n of v.nodes) {
            assert.equal(n.any, undefined, 'Check-tree any must be stripped');
            assert.equal(n.all, undefined, 'Check-tree all must be stripped');
            assert.equal(n.none, undefined, 'Check-tree none must be stripped');
          }
        }
        for (const inc of payload.incomplete) {
          for (const n of inc.nodes) {
            assert.equal(n.any, undefined, 'Check-tree any must be stripped from incomplete nodes');
            assert.equal(n.all, undefined, 'Check-tree all must be stripped from incomplete nodes');
            assert.equal(n.none, undefined, 'Check-tree none must be stripped from incomplete nodes');
          }
        }

        // 4. Metric counts match input
        assert.equal(payload.metrics.passesCount, 1);
        assert.equal(payload.metrics.inapplicableCount, 1);
        assert.equal(payload.metrics.violationsCount, violations.length);
        assert.equal(payload.metrics.incompleteCount, incomplete.length);

        return true;
      }
    ),
    { numRuns: 20 }
  );
});
