import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const serverPath = path.join(root, 'scripts/serve-e2e.mjs');

let serverInstanceCounter = 0;

/**
 * The e2e server is load-bearing for two separate guarantees, and both were broken
 * here before. Locking the headers down costs a second instead of a full performance
 * run.
 */
async function withServer(run) {
  const port = 8100 + ((process.pid * 17 + (serverInstanceCounter++ * 13)) % 1500);
  const child = spawn(process.execPath, [serverPath, String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderrOutput = '';
  child.stderr?.on('data', (chunk) => {
    stderrOutput += String(chunk);
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`the server did not start in time. Stderr: ${stderrOutput}`)), 15_000);
      child.stdout.on('data', (chunk) => {
        if (String(chunk).includes('Range enabled')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`the server exited early with code ${code}. Stderr: ${stderrOutput}`));
      });
    });
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    child.kill('SIGKILL');
    await new Promise((resolve) => {
      if (child.exitCode !== null || child.killed) {
        resolve();
      } else {
        child.once('exit', resolve);
      }
    });
  }
}

test('the e2e server permits a cache hit, which the warm-frame budget depends on', async () => {
  await withServer(async (base) => {
    const first = await fetch(`${base}/src/scripts/player.js`);
    const second = await fetch(`${base}/src/scripts/player.js`);

    // SC-008 measures a *warm* first frame and proves it is warm by finding a
    // resource with transferSize === 0, which only happens when the response can
    // be stored and replayed. `no-store` here makes that assertion permanently
    // false; `no-cache` would not help, because a 304 still carries header bytes.
    const cacheControl = second.headers.get('cache-control') ?? '';
    assert.match(cacheControl, /max-age=\d+/, 'the server must send a freshness lifetime');
    assert.doesNotMatch(cacheControl, /no-store/, 'no-store makes a cache hit impossible');

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
  });
});

test('the e2e server answers a Range request with 206, which media seeking depends on', async () => {
  await withServer(async (base) => {
    const full = await fetch(`${base}/tests/fixtures/assets/audio/scene-01.wav`);
    const fullSize = Number(full.headers.get('content-length'));

    const partial = await fetch(`${base}/tests/fixtures/assets/audio/scene-01.wav`, {
      headers: { Range: 'bytes=0-1023' }
    });
    assert.equal(partial.status, 206, 'a media element that seeks needs 206, not a full 200');
    assert.equal(partial.headers.get('content-range'), `bytes 0-1023/${fullSize}`);
    assert.equal(partial.headers.get('accept-ranges'), 'bytes');
    assert.equal((await partial.arrayBuffer()).byteLength, 1024);

    // An unsatisfiable Range must not degrade into a misleading 200, which is what
    // WebKit rejects with "unexpected 200 HTTP status code for range request".
    const bad = await fetch(`${base}/tests/fixtures/assets/audio/scene-01.wav`, {
      headers: { Range: 'bytes=99999999-' }
    });
    assert.equal(bad.status, 416);
  });
});

test('the e2e server will not serve a path outside the repository', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/../../../etc/passwd`, { redirect: 'manual' });
    assert.ok(response.status === 404 || response.status === 403, `expected the traversal to be refused, got ${response.status}`);
    const body = await response.text();
    assert.doesNotMatch(body, /root:/);
  });
});
