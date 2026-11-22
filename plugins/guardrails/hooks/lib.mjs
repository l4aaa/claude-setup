import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const toPosix = (p) => String(p).replace(/\\/g, '/');

export const tokenize = (text) => text.match(/[^\s"'`]+/g) ?? [];

export const isMain = (metaUrl) =>
  process.argv[1] !== undefined && fileURLToPath(metaUrl) === resolve(process.argv[1]);

export function run(check) {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  const reason = check(payload);
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exit(2);
  }
}
