import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check } from '../plugins/guardrails/hooks/secret-guard.mjs';

const file = (tool_name, file_path) => ({ tool_name, tool_input: { file_path } });
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

const blocked = [
  file('Read', 'C:\\proj\\.env'),
  file('Edit', '/work/app/.env.local'),
  file('Read', '/home/u/.ssh/id_ed25519'),
  file('Read', 'C:\\Users\\u\\.aws\\credentials'),
  file('Write', '/work/certs/server.pem'),
  file('Read', 'C:\\Users\\u\\.claude.json'),
  { tool_name: 'Grep', tool_input: { path: '/home/u/.ssh' } },
  bash('cat .env'),
  bash('cat ./config/server.key'),
  bash('type C:\\Users\\u\\.aws\\credentials'),
  bash('cp secrets --file=.env /tmp'),
  bash('git add .env'),
];

const allowed = [
  file('Read', '/work/app/.env.example'),
  file('Read', 'src/index.ts'),
  file('Edit', 'src/environment.ts'),
  file('Read', 'C:\\proj\\README.md'),
  file('Read', '/work/keys/id_rsa.pub'),
  bash('git status'),
  bash('npm test'),
  bash('ls src'),
  { tool_name: 'Bash', tool_input: {} },
  {},
  undefined,
];

test('blocks secret and credential access', () => {
  for (const payload of blocked) assert.ok(check(payload), JSON.stringify(payload));
});

test('allows ordinary access and templates', () => {
  for (const payload of allowed) assert.equal(check(payload), undefined, JSON.stringify(payload));
});
