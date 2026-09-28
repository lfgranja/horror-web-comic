import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

// T160/T175: the delivery budgets must be ENFORCED by the production gate,
// not merely documented. These tests run on every Playwright project with no
// skip: a host that cannot certify a threshold fails loudly instead of
// passing silently.

test.describe('zz-ci delivery budgets are pinned and enforced', () => {
  test('budget.json pins the spec byte limits (FR-029)', () => {
    // Decimal, matching the limits the specification states literally (SC-014:
    // "cena inicial <=1,5 MB, cada quadro <=300 KB, total de ativos <=30 MB, codigo
    // comprimido <=65 KB"). These were binary MiB/KiB values (1572864, 307200, ...)
    // that PR #10 replaced in budget.json without updating this guard, so every
    // assertion here disagreed with the file it exists to protect. The units are
    // spelled out in each message because "MB" alone is ambiguous between SI and
    // binary, and that ambiguity is what allowed the two to drift apart.
    const budget = readJson('budget.json');
    expect(budget.initialSceneBytes, 'initial scene must stay <= 1.5 MB (1500000 bytes)').toBe(1500000);
    expect(budget.frameBytes, 'per-frame must stay <= 300 KB (300000 bytes)').toBe(300000);
    expect(budget.totalAssetsBytes, 'total assets must stay <= 30 MB (30000000 bytes)').toBe(30000000);
    expect(budget.compressedScriptBytes, 'compressed script must stay <= 50 KB (50000 bytes)').toBe(50000);
    expect(budget.compressedStyleBytes, 'compressed style must stay <= 15 KB (15000 bytes)').toBe(15000);
    expect(budget.compressedCodeBytes, 'compressed code aggregate must stay <= 65 KB (65000 bytes)').toBe(65000);
  });

  test('lighthouserc.json enforces the delivery thresholds (SC-014/SC-015)', () => {
    const config = readJson('lighthouserc.json');
    const assertions = config.ci.assert.assertions;
    expect(assertions['categories:performance'][0]).toBe('error');
    expect(assertions['categories:performance'][1].minScore).toBe(0.9);
    expect(assertions['categories:accessibility'][0]).toBe('error');
    expect(assertions['categories:accessibility'][1].minScore).toBe(0.95);
    expect(assertions['cumulative-layout-shift'][0]).toBe('error');
    expect(assertions['cumulative-layout-shift'][1].maxNumericValue).toBe(0.1);
    expect(assertions['largest-contentful-paint'][0]).toBe('error');
    expect(assertions['largest-contentful-paint'][1].maxNumericValue).toBe(2500);
  });

  test('scripts/build.mjs fails the build when budgets are exceeded', () => {
    const build = readText('scripts/build.mjs');
    expect(build.includes('asset-budget-exceeded'), 'build must throw asset-budget-exceeded').toBe(true);
    expect(build.includes('code-budget-exceeded'), 'build must throw code-budget-exceeded').toBe(true);
    expect(build.includes('process.exitCode = 1'), 'build must exit non-zero on failure').toBe(true);
  });

  test('CI workflow runs the full gate in order plus Lighthouse (T161)', () => {
    const workflow = readText('.github/workflows/ci.yml');
    const steps = ['npm run preflight', 'npm run validate', 'npm run test:unit', 'npm run build:images', 'npm run build', 'npm run test:e2e', 'npm run test:perf'];
    let lastIndex = -1;
    for (const step of steps) {
      // Anchor on the full `run:` line so `npm run build` does not match the
      // `npm run build:images` prefix.
      const index = workflow.indexOf(`run: ${step}\n`);
      expect(index, `workflow must run ${step}`).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    expect(workflow.includes('ci:lighthouse') || workflow.includes('lhci'), 'workflow must run the Lighthouse gate').toBe(true);
    expect(workflow.includes('playwright-report'), 'workflow must upload the Playwright report on failure').toBe(true);
    expect(workflow.includes('.lighthouseci'), 'workflow must upload Lighthouse output on failure').toBe(true);
    for (const masked of ['|| true', 'exit 0', '--force']) {
      expect(workflow.includes(masked), `workflow must not mask failures with ${masked}`).toBe(false);
    }
  });
});

test.describe('zz-ci perf gates fail loudly, never skip (T139)', () => {
  test('host that cannot sample frames fails instead of skipping', async ({ page }) => {
    await page.goto('/?story=tests/fixtures/story.json');
    await expect(page.locator('#player')).toBeVisible();
    const result = await page.evaluate(() => new Promise((resolve) => {
      let frames = 0;
      let first = 0;
      let last = 0;
      const tick = (now) => {
        if (!first) first = now;
        else {
          frames += 1;
          last = now;
        }
        if (now - first < 300) requestAnimationFrame(tick);
        else resolve({ frames, elapsed: Math.max(1, last - first) });
      };
      requestAnimationFrame(tick);
    }));
    expect(result.frames, 'host produced no rAF samples in 300ms, so it cannot certify the frame budget — failing loudly instead of skipping').toBeGreaterThan(1);
  });

  test('existing perf specs assert hard thresholds with no silent passes', () => {
    const firstFrame = readText('tests/perf/first-frame.spec.js');
    const fps = readText('tests/perf/fps.spec.js');
    expect(firstFrame.includes('toBeLessThan(2_500)'), 'SC-019 cold first frame < 2.5s must be asserted').toBe(true);
    expect(firstFrame.includes('toBeLessThan(3_000)'), 'SC-008 every frame < 3s must be asserted').toBe(true);
    expect(firstFrame.includes('toBeLessThan(1_500)'), 'SC-008 warm first frame < 1.5s must be asserted').toBe(true);
    expect(fps.includes('toBeGreaterThanOrEqual(60)'), 'SC-018 transition fps >= 60 must be asserted').toBe(true);
    for (const source of [firstFrame, fps]) {
      for (const masked of ['test.fixme', '|| true', 'exit 0', '--pass-with-no-tests']) {
        expect(source.includes(masked), `perf spec must not contain ${masked}`).toBe(false);
      }
    }
    expect(fps.includes('test.skip'), 'fps gate must not skip on any browser').toBe(false);
    // first-frame.spec.js scopes its Chromium-only network profile with a
    // conditional skip that names its reason. Any skip there must stay
    // conditional-with-reason: count bare skips and fail on them.
    const totalSkips = (firstFrame.match(/test\.skip\(/g) || []).length;
    const conditionalSkips = (firstFrame.match(/test\.skip\(\(\{/g) || []).length;
    expect(totalSkips - conditionalSkips, 'perf gate must not gain an unconditional or reason-less skip').toBe(0);
  });
});
