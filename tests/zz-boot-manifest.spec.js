import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// T166 — proves the `?story=` selector is isolated to test tooling:
// (i)   no parameter -> production manifest is used (dev server),
// (ii)  the PRODUCTION build ignores the selector entirely,
// (iii) unsafe values fail closed with the friendly error screen, not a crash.
// Plus a guard test that the dev-server override the E2E suite depends on
// (`tests/e2e/helpers.js` -> `tests/fixtures/story.json`) still works.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionStory = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/data/story.json'), 'utf8'));
const fixtureStory = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tests/fixtures/story.json'), 'utf8'));
const PRODUCTION_FRAME_ALT = productionStory.scenes[0].frames[0].alt;
const FIXTURE_FRAME_ALT = fixtureStory.scenes[0].frames[0].alt;
if (PRODUCTION_FRAME_ALT === FIXTURE_FRAME_ALT) {
  throw new Error('zz-boot precondition broken: production and fixture first-frame alt text must differ');
}

const MIME = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.opus': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4'
}));

function startStaticServer(root) {
  const server = http.createServer((req, res) => {
    (async () => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const target = path.normalize(path.join(root, pathname.slice(1)));
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const data = await fs.promises.readFile(target);
      res.writeHead(200, { 'content-type': MIME.get(path.extname(target).toLowerCase()) || 'application/octet-stream' });
      res.end(data);
    })().catch((error) => {
      res.writeHead(error?.code === 'ENOENT' ? 404 : 500).end('missing');
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

async function manifestRequestPaths(page) {
  const paths = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('.json')) paths.push(url.pathname);
  });
  return paths;
}

async function bootDevPlayer(page, url) {
  await page.goto(url);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', /.+/);
}

test('no parameter uses the production manifest', async ({ page }) => {
  const manifests = await manifestRequestPaths(page);
  await bootDevPlayer(page, '/');
  await expect(page.locator('#story-title')).toHaveText(productionStory.title);
  await expect(page.locator('#frame-image')).toHaveAttribute('alt', PRODUCTION_FRAME_ALT);
  expect(manifests).toContain('/src/data/story.json');
  expect(manifests).not.toContain('/tests/fixtures/story.json');
});

test('dev-server override for tests/ fixtures still works (E2E tooling)', async ({ page }) => {
  const manifests = await manifestRequestPaths(page);
  await bootDevPlayer(page, `/?story=${encodeURIComponent('tests/fixtures/story.json')}`);
  await expect(page.locator('#frame-image')).toHaveAttribute('alt', FIXTURE_FRAME_ALT);
  expect(manifests).toContain('/tests/fixtures/story.json');
});

test.describe('production build ignores the selector', () => {
  let server;
  let distUrl;

  test.beforeAll(async () => {
    const distRoot = path.join(repoRoot, 'dist');
    if (!fs.existsSync(path.join(distRoot, 'index.html'))) {
      throw new Error('dist/ is missing: run `npm run build` before this spec');
    }
    server = await startStaticServer(distRoot);
    distUrl = `http://127.0.0.1:${server.address().port}`;
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve));
  });

  for (const story of ['tests/fixtures/story.json', 'src/data/other.json']) {
    test(`dist ignores ?story=${story}`, async ({ page }) => {
      const manifests = await manifestRequestPaths(page);
      await page.goto(`${distUrl}/?story=${encodeURIComponent(story)}`);
      await expect(page.locator('#player')).toBeVisible();
      await expect(page.locator('#player')).toHaveAttribute('data-frame-id', /.+/);
      await expect(page.locator('#story-title')).toHaveText(productionStory.title);
      await expect(page.locator('#frame-image')).toHaveAttribute('alt', PRODUCTION_FRAME_ALT);
      await expect(page.locator('#error-screen')).toBeHidden();
      expect(manifests).toContain('/src/data/story.json');
      for (const requested of manifests) {
        expect(requested, 'production must never request a non-production manifest').not.toContain('other.json');
        expect(requested, 'production must never request test fixtures').not.toContain('/tests/');
      }
    });
  }
});

for (const story of ['../package.json', '/src/data/story.json', '//evil.test/x.json', 'https://example.com/x.json']) {
  test(`unsafe ?story=${story} fails closed with the friendly error screen`, async ({ page }) => {
    const response = await page.goto(`/?story=${encodeURIComponent(story)}`);
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator('#error-screen')).toBeVisible();
    await expect(page.locator('#error-screen')).toContainText(/conteúdo|narrativa/i);
    await expect(page.locator('#player')).toBeHidden();
    await expect(page.locator('body')).not.toBeEmpty();
  });
}
