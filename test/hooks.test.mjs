import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkHooks } from '../scripts/check-hooks.mjs';

test('hook commands run end to end with the expected exit codes', () => {
  const results = checkHooks(join(import.meta.dirname, '..', 'plugins', 'guardrails'));
  assert.equal(results.length, 4);
  for (const { name, ok, detail } of results) assert.ok(ok, `${name}: ${detail}`);
});
