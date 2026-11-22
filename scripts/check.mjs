import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkHooks } from './check-hooks.mjs';
import { claudeDir, exec, findClaude, sameContent } from './shared.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = 'guardrails@l4aaa-toolkit';

function checkConfig() {
  return ['CLAUDE.md', 'settings.json'].map((name) => {
    const dest = join(claudeDir, name);
    const ok = existsSync(dest) && sameContent(name, readFileSync(join(root, 'config', name)), readFileSync(dest));
    return { name: `${name} matches the repo`, ok, detail: 'run node install.mjs' };
  });
}

function installedPlugin() {
  const claude = findClaude();
  if (!claude) return undefined;
  try {
    return JSON.parse(exec(claude, ['plugin', 'list', '--json']).stdout).find((p) => p.id === PLUGIN);
  } catch {
    return undefined;
  }
}

const plugin = installedPlugin();
const results = [
  ...checkConfig(),
  { name: `${PLUGIN} installed and enabled`, ok: Boolean(plugin?.enabled), detail: 'run node install.mjs' },
  ...(plugin ? checkHooks(plugin.installPath) : []),
];

for (const { name, ok, detail } of results) console.log(ok ? `ok    ${name}` : `FAIL  ${name} (${detail})`);

process.exit(results.every((result) => result.ok) ? 0 : 1);
