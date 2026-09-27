import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findLoadBearingReferences, scanPublishableResources } from '../../scripts/build.mjs';

test('ignores SVG namespace identifiers while finding load-bearing origins', () => {
  const content = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image href="//evil.example/image.png" /></svg>';
  const references = findLoadBearingReferences(content, 'assets/icon.svg');
  assert.deepEqual(references.map((entry) => entry.reference), ['//evil.example/image.png']);
});

test('finds external and protocol-relative references in every text resource', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'origin-scan-'));
  await fs.mkdir(path.join(root, 'assets/icons'), { recursive: true });
  await fs.writeFile(path.join(root, 'index.html'), '<script src="https://evil.example/app.js"></script>');
  await fs.writeFile(path.join(root, 'assets/icons/load.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><use href="//evil.example/icon.svg#x" /></svg>');
  const findings = await scanPublishableResources(root);
  assert.ok(findings.some((entry) => entry.file === 'index.html' && entry.reference === 'https://evil.example/app.js'));
  assert.ok(findings.some((entry) => entry.file === 'assets/icons/load.svg' && entry.reference === '//evil.example/icon.svg#x'));
  await fs.rm(root, { recursive: true, force: true });
});

test('does not treat a namespace declaration as an external origin', () => {
  const references = findLoadBearingReferences('<svg xmlns="http://www.w3.org/2000/svg" />', 'assets/icon.svg');
  assert.deepEqual(references, []);
});

test('does not treat escaped JavaScript regex delimiters as protocol-relative URLs', () => {
  const references = findLoadBearingReferences(String.raw`const external = /^(?:https?:)?\/\//i.test(value);`, 'src/scripts/check.js');
  assert.deepEqual(references, []);
});
