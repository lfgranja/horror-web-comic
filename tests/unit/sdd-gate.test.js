import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GATE_SOURCE = fileURLToPath(new URL('../../scripts/ci/sdd-gate.py', import.meta.url));

const BASE_FILES = {
  'AGENTS.md': '# repo\n',
  '.specify/memory/constitution.md': '# constitution\n',
  'specs/001-demo/spec.md': '# spec\n',
  'docs/governance/satellite-manifest.json': JSON.stringify({
    status: 'parcial',
    hub_sha: 'deadbeef',
    adopted_policies: ['001'],
    target: 'horror-web-comic',
    host: 'github',
    files_present: []
  }),
  'docs/governance/hub-policy-manifest.json': JSON.stringify({
    required_policies: ['001'],
    required_files: [],
    hub_sha: 'deadbeef'
  })
};

function fixture({ baseline = { exceptions: {}, allow_missing: {} }, validate, release, registry }) {
  const root = mkdtempSync(join(tmpdir(), 'sdd-gate-'));
  for (const [rel, content] of Object.entries(BASE_FILES)) {
    const p = join(root, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, content);
  }
  mkdirSync(join(root, '.specify/validations/001-demo'), { recursive: true });
  mkdirSync(join(root, '.specify/releases/001-demo'), { recursive: true });
  if (validate !== undefined) writeFileSync(join(root, '.specify/validations/001-demo/validate.md'), validate);
  if (release !== undefined) writeFileSync(join(root, '.specify/releases/001-demo/release.md'), release);
  writeFileSync(join(root, 'docs/governance/sdd-chain-baseline.json'), JSON.stringify(baseline));
  if (registry !== undefined) {
    mkdirSync(join(root, 'specs', '901-demo', 'registry'), { recursive: true });
    writeFileSync(join(root, 'specs', '901-demo', 'registry', 'escalations.yaml'), registry);
  }
  return root;
}

function withFixture(t, options) {
  const root = fixture(options);
  // The gate resolves the repository root from its own location, so the
  // fixture runs a *copy* of the script inside the temporary tree.
  const gate = join(root, 'scripts', 'ci', 'sdd-gate.py');
  mkdirSync(join(gate, '..'), { recursive: true });
  writeFileSync(gate, readFileSync(GATE_SOURCE));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, gate };
}

function run({ root, gate }) {
  const result = spawnSync('python3', [gate], { cwd: root, encoding: 'utf8' });
  return { code: result.status, out: `${result.stdout}\n${result.stderr}` };
}

const APPROVED = '- **Resultado:** **APPROVED**\n**APPROVED** para fins de R4.\n';
const NOT_APPROVED = '- **Resultado:** **BLOCKED / NOT APPROVED**\n**NOT APPROVED** enquanto T047 pendente.\n';
const RELEASED = '- **Status:** **RELEASED (retroativo)**\n';
const UNRELEASED = '- **Status:** **UNRELEASED**\n';
const NOT_READY = '- **Status:** **NOT READY / PENDING**\n';

test('missing release without baseline exception fails R7', (t) => {
  const root = withFixture(t, { validate: APPROVED });
  const { code, out } = run(root);
  assert.notEqual(code, 0);
  assert.match(out, /missing release\.md for 001-demo \(R7\)/);
});

test('released + approved validation passes the chain', (t) => {
  const root = withFixture(t, { validate: APPROVED, release: RELEASED });
  const { code, out } = run(root);
  assert.equal(code, 0, out);
  assert.match(out, /sdd-gate: PASS/);
});

test('unreleased status is not read as released', (t) => {
  // “unreleased” contains “released”; the gate must parse the status line instead.
  const root = withFixture(t, {
    validate: APPROVED,
    release: UNRELEASED,
    baseline: { exceptions: {}, allow_missing: {} }
  });
  const { code, out } = run(root);
  assert.notEqual(code, 0);
  assert.match(out, /release\.md not released for 001-demo \(R7\): status not_ready/);
});

test('not-ready release passes when the baseline documents it', (t) => {
  const root = withFixture(t, {
    validate: NOT_APPROVED,
    release: NOT_READY,
    baseline: {
      exceptions: { '001-demo': { validate_status: 'blocked', release_status: 'not_ready', reason: 'evidence pending' } },
      allow_missing: {}
    }
  });
  const { code, out } = run(root);
  assert.equal(code, 0, out);
});

test('released while validation is not approved fails R4\u2192R7 coupling', (t) => {
  const root = withFixture(t, { validate: NOT_APPROVED, release: RELEASED });
  const { code, out } = run(root);
  assert.notEqual(code, 0);
  assert.match(out, /RELEASED for 001-demo but validate\.md is not APPROVED/);
});

test('escalation registry with a dangling ref fails', (t) => {
  const root = withFixture(t, {
    validate: APPROVED,
    release: RELEASED,
    registry: [
      '- id: ESC-HWC-20261111-900',
      '  status: aberto',
      '  owner: "@owner"',
      '  bloqueio: "demo"',
      '  impacto: "demo impact"',
      '  refs:',
      '    - "docs/governance/DOES_NOT_EXIST.md (missing)"'
    ].join('\n')
  });
  const { code, out } = run(root);
  assert.notEqual(code, 0);
  assert.match(out, /dangling ref 'docs\/governance\/DOES_NOT_EXIST\.md'/);
});

test('escalation registry with a malformed entry fails', (t) => {
  const root = withFixture(t, {
    validate: APPROVED,
    release: RELEASED,
    registry: [
      '- id: not-an-id',
      '  owner: ""',
      '  status: aberto'
    ].join('\n')
  });
  const { code, out } = run(root);
  assert.notEqual(code, 0);
  assert.match(out, /missing\/invalid id/);
  assert.match(out, /missing required field 'bloqueio'/);
});

test('escalation registry with existing refs passes', (t) => {
  const root = withFixture(t, {
    validate: APPROVED,
    release: RELEASED,
    registry: [
      '- id: ESC-HWC-20261111-900',
      '  status: aberto',
      '  owner: "@owner"',
      '  bloqueio: "demo"',
      '  impacto: "demo impact"',
      '  refs: ["AGENTS.md"]'
    ].join('\n')
  });
  const { code, out } = run(root);
  assert.equal(code, 0, out);
  assert.match(out, /1 escalation entry validated/);
});

test('released despite block passes with explicit baseline waiver', (t) => {
  const root = withFixture(t, {
    validate: NOT_APPROVED,
    release: RELEASED,
    baseline: {
      exceptions: { '001-demo': { validate_status: 'blocked', release_status: 'blocked', allow_release_despite_unapproved_validation: true, reason: 'documented retroactive exception' } },
      allow_missing: {}
    }
  });
  const { code, out } = run(root);
  assert.equal(code, 0, out);
  assert.match(out, /explicit baseline waiver/);
});

