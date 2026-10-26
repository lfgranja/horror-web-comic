import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fc from 'fast-check';
import { attachAuditArtifacts } from '../e2e/helpers/audit-attachment-helper.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const AUDIT_SCHEMA_PATH = resolve('specs/004-wcag-aaa-audit-pipeline/contracts/audit-report.schema.json');
const TELEMETRY_SCHEMA_PATH = resolve('specs/004-wcag-aaa-audit-pipeline/contracts/failure-telemetry.schema.json');

const auditSchema = JSON.parse(readFileSync(AUDIT_SCHEMA_PATH, 'utf-8'));
const telemetrySchema = JSON.parse(readFileSync(TELEMETRY_SCHEMA_PATH, 'utf-8'));

const validateAudit = ajv.compile(auditSchema);
const validateTelemetry = ajv.compile(telemetrySchema);

const validAudit = JSON.parse(readFileSync('tests/fixtures/audit/valid-audit-report.json', 'utf-8'));
const invalidAudit = JSON.parse(readFileSync('tests/fixtures/audit/invalid-audit-report.json', 'utf-8'));
const validTelemetry = JSON.parse(readFileSync('tests/fixtures/audit/valid-failure-telemetry.json', 'utf-8'));
const invalidTelemetry = JSON.parse(readFileSync('tests/fixtures/audit/invalid-failure-telemetry.json', 'utf-8'));

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

// Existing Schema Tests
test('AuditReport Schema: compiles and accepts canonical valid-audit-report.json fixture', () => {
  const isValid = validateAudit(validAudit);
  assert.equal(isValid, true, `Schema validation errors: ${JSON.stringify(validateAudit.errors)}`);
});

test('AuditReport Schema: rejects invalid-audit-report.json fixture with missing required fields', () => {
  const isValid = validateAudit(invalidAudit);
  assert.equal(isValid, false, 'Invalid audit report fixture must fail schema validation');
  assert.ok(validateAudit.errors && validateAudit.errors.length > 0);
});

test('AuditReport Schema: rejects unexpected top-level and metadata properties (additionalProperties: false)', () => {
  const cloned = JSON.parse(JSON.stringify(validAudit));
  cloned.unexpectedField = 'should-fail';
  assert.equal(validateAudit(cloned), false);

  const clonedMeta = JSON.parse(JSON.stringify(validAudit));
  clonedMeta.metadata.unexpectedMeta = 'should-fail';
  assert.equal(validateAudit(clonedMeta), false);
});

test('AuditReport Schema: enforces ISO 8601 UTC date-time format for metadata.timestamp', () => {
  const cloned = JSON.parse(JSON.stringify(validAudit));
  cloned.metadata.timestamp = 'invalid-timestamp';
  assert.equal(validateAudit(cloned), false);
});

test('FailureTelemetry Schema: compiles and accepts canonical valid-failure-telemetry.json fixture', () => {
  const isValid = validateTelemetry(validTelemetry);
  assert.equal(isValid, true, `Telemetry validation errors: ${JSON.stringify(validateTelemetry.errors)}`);
});

test('FailureTelemetry Schema: rejects invalid-failure-telemetry.json fixture with missing fields', () => {
  const isValid = validateTelemetry(invalidTelemetry);
  assert.equal(isValid, false, 'Invalid failure telemetry fixture must fail schema validation');
  assert.ok(validateTelemetry.errors && validateTelemetry.errors.length > 0);
});

test('Property-Based Invariant: valid audit report survives JSON roundtrip invariance', () => {
  fc.assert(
    fc.property(fc.constant(validAudit), (report) => {
      const roundtripped = JSON.parse(JSON.stringify(report));
      return validateAudit(roundtripped) === true;
    }),
    { numRuns: 10 }
  );
});

test('Property-Based Invariant: removing any required top-level property causes validation failure', () => {
  const requiredKeys = ['metadata', 'theme', 'state', 'metrics', 'violations', 'incomplete', 'targetSizeSummary'];
  fc.assert(
    fc.property(fc.constantFrom(...requiredKeys), (keyToRemove) => {
      const mutant = JSON.parse(JSON.stringify(validAudit));
      delete mutant[keyToRemove];
      return validateAudit(mutant) === false;
    }),
    { numRuns: requiredKeys.length }
  );
});

// T033: Unit tests for deterministic node truncation in audit-report.schema.json
test('AuditReport Schema (T033): accepts deterministic truncation fields (truncated: true, totalNodes: 25) in violations', () => {
  const cloned = JSON.parse(JSON.stringify(validAudit));
  cloned.violations = [
    {
      id: 'color-contrast-enhanced',
      impact: 'serious',
      description: 'Elements must meet contrast requirements',
      help: 'Elements must have >= 7:1 contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
      tags: ['wcag2aaa', 'wcag146'],
      truncated: true,
      totalNodes: 25,
      nodes: Array.from({ length: 10 }, (_, i) => ({
        target: [`#node-${i}`],
        html: `<div>Node ${i}</div>`,
        failureSummary: `Fix node ${i}`
      }))
    }
  ];

  const isValid = validateAudit(cloned);
  assert.equal(isValid, true, `Schema must accept truncated violations: ${JSON.stringify(validateAudit.errors)}`);
});

test('AuditReport Schema (T033): accepts deterministic truncation fields (truncated: true, totalNodes: 14) in incomplete', () => {
  const cloned = JSON.parse(JSON.stringify(validAudit));
  cloned.incomplete = [
    {
      id: 'color-contrast',
      impact: 'moderate',
      description: 'Color contrast check inconclusive',
      help: 'Check manually',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast',
      tags: ['wcag2aaa'],
      truncated: true,
      totalNodes: 14,
      nodes: Array.from({ length: 10 }, (_, i) => ({
        target: [`#inc-node-${i}`],
        html: `<div>Incomplete ${i}</div>`
      }))
    }
  ];

  const isValid = validateAudit(cloned);
  assert.equal(isValid, true, `Schema must accept truncated incomplete: ${JSON.stringify(validateAudit.errors)}`);
});

test('AuditReport Schema (T033): rejects invalid truncated and totalNodes types in violations and incomplete', () => {
  // 1. truncated must be boolean
  const mutantTruncated = JSON.parse(JSON.stringify(validAudit));
  mutantTruncated.violations = [
    {
      id: 'color-contrast-enhanced',
      impact: 'serious',
      description: 'Contrast issue',
      help: 'Fix contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
      tags: ['wcag2aaa'],
      truncated: 'true', // string should fail
      totalNodes: 15,
      nodes: [{ target: ['#el'], html: '<div></div>', failureSummary: 'Fix' }]
    }
  ];
  assert.equal(validateAudit(mutantTruncated), false, 'Non-boolean truncated must be rejected');

  // 2. totalNodes must be an integer >= 0
  const mutantNegativeTotal = JSON.parse(JSON.stringify(validAudit));
  mutantNegativeTotal.violations = [
    {
      id: 'color-contrast-enhanced',
      impact: 'serious',
      description: 'Contrast issue',
      help: 'Fix contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
      tags: ['wcag2aaa'],
      truncated: true,
      totalNodes: -1, // negative should fail
      nodes: [{ target: ['#el'], html: '<div></div>', failureSummary: 'Fix' }]
    }
  ];
  assert.equal(validateAudit(mutantNegativeTotal), false, 'Negative totalNodes must be rejected');

  // 3. totalNodes must not be float
  const mutantFloatTotal = JSON.parse(JSON.stringify(validAudit));
  mutantFloatTotal.violations = [
    {
      id: 'color-contrast-enhanced',
      impact: 'serious',
      description: 'Contrast issue',
      help: 'Fix contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
      tags: ['wcag2aaa'],
      truncated: true,
      totalNodes: 10.5, // float should fail
      nodes: [{ target: ['#el'], html: '<div></div>', failureSummary: 'Fix' }]
    }
  ];
  assert.equal(validateAudit(mutantFloatTotal), false, 'Float totalNodes must be rejected');
});

// T033: Unit tests for incomplete metadata preservation in audit-report.schema.json
test('AuditReport Schema (T033): accepts complete metadata (impact, help, helpUrl, tags) on incomplete diagnostics', () => {
  const cloned = JSON.parse(JSON.stringify(validAudit));
  cloned.incomplete = [
    {
      id: 'color-contrast-enhanced',
      impact: 'serious',
      description: 'Background contains complex gradient',
      help: 'Verify contrast manually against background gradient',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced',
      tags: ['wcag2aaa', 'wcag146', 'cat.color'],
      nodes: [
        {
          target: ['#hero-title'],
          html: '<h1 id="hero-title">Title</h1>',
          failureSummary: 'Cannot compute gradient contrast'
        }
      ]
    }
  ];

  const isValid = validateAudit(cloned);
  assert.equal(isValid, true, `Schema must accept incomplete metadata: ${JSON.stringify(validateAudit.errors)}`);
});

test('AuditReport Schema (T033): rejects invalid incomplete impact enum or invalid helpUrl format', () => {
  // Invalid impact enum
  const mutantImpact = JSON.parse(JSON.stringify(validAudit));
  mutantImpact.incomplete = [
    {
      id: 'color-contrast',
      impact: 'extreme', // invalid enum
      description: 'Check',
      nodes: [{ target: ['#x'], html: '<div></div>' }]
    }
  ];
  assert.equal(validateAudit(mutantImpact), false, 'Invalid incomplete impact enum must be rejected');

  // Invalid helpUrl format (must be uri)
  const mutantUrl = JSON.parse(JSON.stringify(validAudit));
  mutantUrl.incomplete = [
    {
      id: 'color-contrast',
      description: 'Check',
      helpUrl: 'not_a_valid_uri',
      nodes: [{ target: ['#x'], html: '<div></div>' }]
    }
  ];
  assert.equal(validateAudit(mutantUrl), false, 'Invalid incomplete helpUrl format must be rejected');
});

// T033: Direct schema validation of payloads generated by attachAuditArtifacts
test('AuditReport Schema (T033): generated payload from attachAuditArtifacts passes schema validation directly', async () => {
  const testInfo = createMockTestInfo();
  const payload = await attachAuditArtifacts(
    testInfo,
    { passes: [], violations: [], incomplete: [], inapplicable: [] },
    'cinema',
    'resting'
  );

  const isValid = validateAudit(payload);
  assert.equal(isValid, true, `Generated payload must satisfy schema: ${JSON.stringify(validateAudit.errors)}`);
});

test('AuditReport Schema (T033): generated payload with non-empty violations and targetSizeSummary passes schema validation', async () => {
  const testInfo = createMockTestInfo();
  const sampleResults = {
    passes: [{ id: 'aria-valid' }],
    violations: [
      {
        id: 'color-contrast-enhanced',
        impact: 'serious',
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
        description: 'Complex gradient',
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
    compliantCount: 2,
    nonCompliantCount: 0,
    smallestTarget: { id: 'next', width: 44, height: 44 },
    controls: [
      {
        selector: '#next',
        id: 'next',
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
    'noir',
    'interactive-audio',
    targetSizeSummary,
    250
  );

  const isValid = validateAudit(payload);
  assert.equal(isValid, true, `Payload with violations must satisfy schema: ${JSON.stringify(validateAudit.errors)}`);
});

test('AuditReport Schema (T033): generated payload with > 10 nodes asserts deterministic truncation and passes schema validation', async () => {
  const testInfo = createMockTestInfo();
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

  // RED assertion: asserts deterministic truncation with MAX_NODES_PER_RULE = 10
  assert.equal(payload.violations[0].nodes.length, 10, 'Must truncate nodes array to 10');
  assert.equal(payload.violations[0].truncated, true, 'Must set truncated: true when nodes > 10');
  assert.equal(payload.violations[0].totalNodes, 15, 'Must set totalNodes to original count of 15');

  const isValid = validateAudit(payload);
  assert.equal(isValid, true, `Truncated payload must pass schema validation: ${JSON.stringify(validateAudit.errors)}`);
});

test('AuditReport Schema (T033): generated payload preserves incomplete metadata and passes schema validation', async () => {
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

  // RED assertion: asserts incomplete metadata is preserved
  assert.equal(payload.incomplete[0].impact, 'serious', 'Incomplete impact must be preserved');
  assert.equal(payload.incomplete[0].help, 'Verify text contrast manually against the gradient background', 'Incomplete help must be preserved');
  assert.equal(payload.incomplete[0].helpUrl, 'https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced', 'Incomplete helpUrl must be preserved');
  assert.deepEqual(payload.incomplete[0].tags, ['wcag2aaa', 'wcag146', 'cat.color'], 'Incomplete tags must be preserved');

  const isValid = validateAudit(payload);
  assert.equal(isValid, true, `Payload with incomplete metadata must pass schema validation: ${JSON.stringify(validateAudit.errors)}`);
});

test('Property-Based Invariant (T033): payloads generated by attachAuditArtifacts pass schema validation across arbitrary themes and states', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('cinema', 'noir', 'eldritch', 'industrial', 'shadow-props'),
      fc.constantFrom('resting', 'dynamic-traversal', 'interactive-audio', 'end-state'),
      fc.integer({ min: 0, max: 20000 }),
      async (theme, state, durationMs) => {
        const testInfo = createMockTestInfo();
        const payload = await attachAuditArtifacts(
          testInfo,
          { passes: [{ id: 'aria-valid' }], violations: [], incomplete: [], inapplicable: [] },
          theme,
          state,
          null,
          durationMs
        );

        const isValid = validateAudit(payload);
        assert.equal(isValid, true, `Generated payload must satisfy schema: ${JSON.stringify(validateAudit.errors)}`);
        return true;
      }
    ),
    { numRuns: 20 }
  );
});
