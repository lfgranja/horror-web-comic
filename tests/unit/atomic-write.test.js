import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileAtomic } from '../../scripts/atomic-write.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('writeFileAtomic writes file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'aw-'));
  const target = path.join(dir,'out.txt');
  await writeFileAtomic(target,'hello');
  assert.equal(fs.readFileSync(target,'utf8'),'hello');
});
