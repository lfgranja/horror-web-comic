import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSidecarSchema, verifySidecar, findOrphanSidecars } from '../../scripts/sidecar.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('validateSidecarSchema accepts valid doc', () => {
  const doc = { schemaVersion:'1.0', subject:{name:'x.jpg',digest:{sha256:'a'.repeat(64)}}, provenance:{tool:'t',toolVersion:'1',timestamp:'2026-10-18T00:00:00Z',author:'a'}, review:{reviewer:'r',reviewedAt:'2026-10-18T00:00:00Z',oversight:'human_authored',notes:'n',decision:'approve'} };
  assert.doesNotThrow(() => validateSidecarSchema(doc));
});

test('validateSidecarSchema rejects unknown field', () => {
  const doc = { schemaVersion:'1.0', subject:{name:'x.jpg',digest:{sha256:'a'.repeat(64)}}, provenance:{tool:'t',toolVersion:'1',timestamp:'2026-10-18T00:00:00Z',author:'a'}, foo:'bar', review:{reviewer:'r',reviewedAt:'2026-10-18T00:00:00Z',oversight:'human_authored',notes:'n',decision:'approve'} };
  assert.throws(() => validateSidecarSchema(doc));
});
