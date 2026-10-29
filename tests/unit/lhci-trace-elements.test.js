import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const SCREENSHOTS_HANDLER = 'node_modules/@paulirish/trace_engine/models/trace/handlers/ScreenshotsHandler.js';

/**
 * Lighthouse's `largest-contentful-paint-element` audit silently died whenever
 * Chrome renamed `chrome_frame_reporter` to `frame_reporter` in its
 * PipelineReporter events. The installed trace_engine read the old name with no
 * guard, so `.frame_sequence` was read off undefined and the whole
 * TraceElements gatherer — which the LCP element audit, `prioritize-lcp-image`,
 * `lcp-lazy-loaded` and `render-blocking-resources` all depend on — returned an
 * error state instead of a result.
 *
 * That failure mode is quiet: the LCP number itself kept being reported and the
 * gate kept passing, so nothing announced that the element attribution had
 * vanished. These tests pin the fix in the dependency graph, where a downgrade
 * will be caught by `npm test` rather than by reading a report.
 */
test('the installed trace engine reads both frame reporter names', () => {
  const handler = path.join(root, SCREENSHOTS_HANDLER);
  assert.ok(fs.existsSync(handler), `${SCREENSHOTS_HANDLER} must be installed`);
  const source = fs.readFileSync(handler, 'utf8');
  assert.match(
    source,
    /frame_reporter' in args/,
    'the screenshots handler must accept both frame_reporter and chrome_frame_reporter; ' +
    'without the guard, a Chrome that renamed the event makes every RootCauses-dependent audit error out'
  );
  assert.match(source, /frame_sequence/, 'the handler must still read frame_sequence');
});

test('@lhci/cli resolves to a Lighthouse that carries the fix', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const pinned = manifest.devDependencies['@lhci/cli'];
  assert.ok(
    /^\d+\.\d+\.\d+$/.test(pinned),
    `@lhci/cli must be pinned exactly, not by range (pinned as "${pinned}")`
  );
  // 12.1.0 pinned Lighthouse with trace_engine 0.0.23 and reproduced the bug.
  // Lighthouse 12.6.0+ carries trace_engine 0.0.52+, the first release handling
  // the rename. @lhci/cli 0.15.0 is the first to pin such a Lighthouse, and
  // @lhci/cli pins Lighthouse exactly, so the guard belongs on this version.
  const MINIMUM = [0, 15, 0];
  const at = pinned.split('.').map(Number);
  const ordered =
    at[0] > MINIMUM[0] ||
    (at[0] === MINIMUM[0] && at[1] > MINIMUM[1]) ||
    (at[0] === MINIMUM[0] && at[1] === MINIMUM[1] && at[2] >= MINIMUM[2]);
  assert.ok(
    ordered,
    `@lhci/cli ${pinned} predates ${MINIMUM.join('.')}, the first release whose Lighthouse carries the trace_engine fix`
  );
});

test('a Lighthouse report, when one is present, names the LCP element', () => {
  const dir = path.join(root, '.lighthouseci');
  if (!fs.existsSync(dir)) {
    return; // no local run yet; `npm run ci:lighthouse` produces the evidence
  }
  const reports = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.report.json'))
    .map((file) => path.join(dir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const report of reports.slice(0, 3)) {
    const audit = JSON.parse(fs.readFileSync(report, 'utf8')).audits['largest-contentful-paint-element'];
    if (!audit) continue;
    assert.equal(
      audit.errorMessage,
      undefined,
      `${path.basename(report)}: the LCP element audit is in an error state again`
    );
    assert.notEqual(audit.score, null, `${path.basename(report)}: the LCP element audit did not run`);
  }
});
