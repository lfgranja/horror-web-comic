#!/usr/bin/env node
/**
 * Static file server for the e2e suite, with HTTP Range support.
 *
 * `python3 -m http.server` ignores the Range header and answers every partial
 * request with a full 200 response. A media element that has to seek then fails
 * to load, because WebKit rejects it outright —
 *   "Media failed to load: R2: Received unexpected 200 HTTP status code for
 *    range request"
 * — and Firefox can abort the sink with "OnMediaSinkAudioError". Chromium
 * tolerates a non-seekable response, which is why the failure looked
 * engine-specific when it is really a test-server defect.
 *
 * Range support is what makes the audio assertions in the suite meaningful: a
 * test that sets currentTime and then asserts the position is preserved is
 * testing a capability the old server silently removed.
 *
 * Usage: node scripts/serve-e2e.mjs [port] [root]
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = new Map(Object.entries({
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
  '.aac': 'audio/aac',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
}));

function contentType(filePath) {
  return TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
}

/** Resolve a URL path inside root, refusing anything that escapes it. */
function resolveWithin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;
  let start;
  let end;
  if (rawStart === '') {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Number(rawEnd);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

const server = http.createServer(async (request, response) => {
  const target = resolveWithin(repoRoot, request.url ?? '/');
  if (!target) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden\n');
    return;
  }

  let stats;
  try {
    stats = await fs.stat(target);
    if (stats.isDirectory()) {
      const index = path.join(target, 'index.html');
      stats = await fs.stat(index);
      return send(await fs.readFile(index), index, stats, request, response);
    }
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found\n');
    return;
  }
  return send(await fs.readFile(target), target, stats, request, response);
});

async function send(body, filePath, stats, request, response) {
  const headers = {
    'content-type': contentType(filePath),
    'accept-ranges': 'bytes',
    // A freshness lifetime, deliberately, not `no-store`.
    //
    // tests/perf/first-frame.spec.js certifies SC-008 — that a *warm* production
    // first frame arrives within 1.5 s at p75 — and it establishes "warm" by
    // asserting that some /src/ resource reports `transferSize === 0`. In the
    // Resource Timing API that means the response came from cache with no network
    // request at all, which requires a max-age. A previous `no-store` here made
    // that assertion permanently false, and the performance gate could not run.
    //
    // `no-cache` would not be a workaround: a 304 still carries response headers,
    // so transferSize is not 0. This server also sends no ETag or Last-Modified, so
    // a revalidating policy could not produce a 304 either.
    //
    // Safe for correctness: Playwright creates a fresh browser context per test and
    // the HTTP cache is scoped to the context, so nothing survives between tests. A
    // file edited between runs is still picked up, because the next run starts with
    // an empty cache.
    'cache-control': 'public, max-age=60'
  };

  if (request.method === 'HEAD') {
    response.writeHead(200, { ...headers, 'content-length': stats.size });
    response.end();
    return;
  }

  const range = request.headers.range ? parseRange(request.headers.range, stats.size) : null;
  if (range) {
    const slice = body.subarray(range.start, range.end + 1);
    response.writeHead(206, {
      ...headers,
      'content-range': `bytes ${range.start}-${range.end}/${stats.size}`,
      'content-length': slice.length
    });
    response.end(slice);
    return;
  }

  // A Range header we cannot satisfy must not degrade into a misleading 200.
  if (request.headers.range) {
    response.writeHead(416, { ...headers, 'content-range': `bytes */${stats.size}` });
    response.end();
    return;
  }

  response.writeHead(200, { ...headers, 'content-length': stats.size });
  response.end(body);
}

const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);
server.listen(port, '127.0.0.1', () => {
  console.log(`serving ${repoRoot} on http://127.0.0.1:${port} (Range enabled)`);
});
