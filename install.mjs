#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeDir, exec, findClaude, sameContent } from './scripts/shared.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const flags = new Set(process.argv.slice(2));
const dryRun = flags.has('--dry-run') || flags.has('--diff');
const FILES = ['CLAUDE.md', 'settings.json'];
const MARKETPLACE = 'l4aaa/claude-setup';
const MARKETPLACE_NAME = 'l4aaa-toolkit';
const PLUGIN = `guardrails@${MARKETPLACE_NAME}`;

function syncFile(name) {
  const src = join(root, 'config', name);
  const dest = join(claudeDir, name);
  const exists = existsSync(dest);
  if (exists && sameContent(name, readFileSync(src), readFileSync(dest))) return `${name}: unchanged`;
  const backup = `${dest}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  if (dryRun) return `${name}: would ${exists ? `update (backup ${backup})` : 'install'}`;
  mkdirSync(claudeDir, { recursive: true });
  if (exists) copyFileSync(dest, backup);
  copyFileSync(src, dest);
  return `${name}: ${exists ? `updated (backup ${backup})` : 'installed'}`;
}

function marketplaceKnown(claude) {
  try {
    return JSON.parse(exec(claude, ['plugin', 'marketplace', 'list', '--json']).stdout).some(
      (marketplace) => marketplace.name === MARKETPLACE_NAME,
    );
  } catch {
    return false;
  }
}

function installPlugin() {
  const commands = [
    ['plugin', 'marketplace', 'add', MARKETPLACE, '--scope', 'user'],
    ['plugin', 'install', PLUGIN, '--scope', 'user'],
  ];
  const show = (bin) => commands.map((args) => `  ${bin} ${args.join(' ')}`).join('\n');
  const claude = dryRun ? null : findClaude();
  if (!claude) return `plugin: run these once:\n${show('claude')}`;
  return (marketplaceKnown(claude) ? commands.slice(1) : commands)
    .map((args) => {
      const { status, stdout, stderr } = exec(claude, args);
      return `plugin: ${args.slice(0, 3).join(' ')} -> ${status === 0 ? 'ok' : `exit ${status}: ${(stderr || stdout).trim()}`}`;
    })
    .join('\n');
}

const pluginReport = flags.has('--no-plugin') ? undefined : installPlugin();
console.log(FILES.map(syncFile).join('\n'));
if (pluginReport) console.log(pluginReport);
