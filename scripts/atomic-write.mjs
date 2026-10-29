import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export async function writeFileAtomic(targetPath, data) {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(targetPath)}.${crypto.randomUUID()}.tmp`);
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, targetPath);
}

export { fs, path };