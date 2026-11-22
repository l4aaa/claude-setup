import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const root = join(import.meta.dirname, '..');
const dir = mkdtempSync(join(tmpdir(), 'claude-setup-test-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const install = (...flags) => {
  const result = spawnSync(process.execPath, [join(root, 'install.mjs'), '--no-plugin', ...flags], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
const source = (name) => readFileSync(join(root, 'config', name), 'utf8');
const dest = (name) => readFileSync(join(dir, name), 'utf8');

test('--diff writes nothing', () => {
  install('--diff');
  assert.deepEqual(readdirSync(dir), []);
});

test('installs, then is idempotent', () => {
  install();
  assert.equal(dest('CLAUDE.md'), source('CLAUDE.md'));
  assert.equal(dest('settings.json'), source('settings.json'));
  assert.match(install(), /CLAUDE\.md: unchanged/);
  assert.deepEqual(readdirSync(dir).filter((f) => f.includes('.bak-')), []);
});

test('backs up and overwrites a changed file', () => {
  writeFileSync(join(dir, 'settings.json'), '{"local":true}\n');
  install();
  assert.equal(dest('settings.json'), source('settings.json'));
  const backups = readdirSync(dir).filter((f) => f.startsWith('settings.json.bak-'));
  assert.equal(backups.length, 1);
  assert.equal(readFileSync(join(dir, backups[0]), 'utf8'), '{"local":true}\n');
});
