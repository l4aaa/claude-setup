import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (message) => errors.push(message);
const load = (rel) => {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (error) {
    fail(`${rel}: ${error.message}`);
    return null;
  }
};

const RESERVED_MARKETPLACES = new Set([
  'claude-plugins-official', 'claude-code-plugins', 'anthropic-marketplace', 'agent-skills',
  'claude-community', 'inline', 'builtin', 'skills-dir', 'synced',
]);
const RESERVED_PLUGIN = /^(claude|anthropic|claude-code)$|^(claude-|anthropic-|anthropics-|cc-plugin-)/;
const MODES = new Set(['default', 'acceptEdits', 'plan', 'auto', 'dontAsk', 'bypassPermissions']);

const marketplace = load('.claude-plugin/marketplace.json');
const pluginNames = new Set();

if (marketplace) {
  const { name } = marketplace;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name ?? '') || name.includes('..')) fail(`marketplace name invalid: ${name}`);
  if (RESERVED_MARKETPLACES.has(name) || name?.startsWith('claudeai-')) fail(`marketplace name reserved: ${name}`);
  if (!marketplace.owner?.name) fail('marketplace.owner.name is required');
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) fail('marketplace.plugins must be a non-empty array');

  for (const entry of marketplace.plugins ?? []) {
    pluginNames.add(entry.name);
    if (!entry.name || RESERVED_PLUGIN.test(entry.name)) fail(`plugin name invalid or reserved: ${entry.name}`);
    if (typeof entry.source !== 'string' || !entry.source.startsWith('./') || entry.source.includes('..')) {
      fail(`${entry.name}: source must be a "./" relative path`);
      continue;
    }
    const pluginRoot = join(root, entry.source);
    const manifest = load(join(entry.source, '.claude-plugin/plugin.json'));
    if (manifest?.name !== entry.name) fail(`${entry.name}: plugin.json name must match the marketplace entry`);
    if (manifest?.version && entry.version) fail(`${entry.name}: set version in plugin.json or the entry, not both`);

    const hooks = load(join(entry.source, 'hooks/hooks.json'));
    if (hooks && !hooks.hooks) fail(`${entry.name}: hooks.json must wrap events in a top-level "hooks" key`);
    for (const groups of Object.values(hooks?.hooks ?? {})) {
      for (const hook of groups.flatMap((group) => group.hooks ?? [])) {
        const script = hook.command?.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\s]+)/)?.[1];
        if (script && !existsSync(join(pluginRoot, script))) fail(`${entry.name}: hook script missing: ${script}`);
      }
    }
  }

  const settings = load('config/settings.json');
  if (settings) {
    if (!settings.extraKnownMarketplaces?.[name]) fail(`settings.json: extraKnownMarketplaces needs "${name}"`);
    for (const key of Object.keys(settings.enabledPlugins ?? {})) {
      const [plugin, market] = key.split('@');
      if (market !== name || !pluginNames.has(plugin)) fail(`settings.json: enabledPlugins entry not in marketplace: ${key}`);
    }
    const mode = settings.permissions?.defaultMode;
    if (mode && !MODES.has(mode)) fail(`settings.json: invalid defaultMode: ${mode}`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log('validate: ok');
