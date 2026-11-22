#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
const flags = new Set(process.argv.slice(2));
const dryRun = flags.has('--dry-run') || flags.has('--diff');
const FILES = ['CLAUDE.md', 'settings.json'];
const MARKETPLACE = 'l4aaa/claude-setup';
const PLUGIN = 'guardrails@l4aaa-toolkit';

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
};

function sameContent(name, a, b) {
  if (!name.endsWith('.json')) return a.equals(b);
  try {
    return JSON.stringify(canonical(JSON.parse(a))) === JSON.stringify(canonical(JSON.parse(b)));
  } catch {
    return false;
  }
}

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

const exec = (bin, args) => spawnSync(bin, args, { encoding: 'utf8' });

function findClaude() {
  if (exec('claude', ['--version']).status === 0) return 'claude';
  const base = join(process.env.LOCALAPPDATA ?? '', 'Claude-Data');
  const list = (dir) => (existsSync(dir) ? readdirSync(dir) : []);
  const numeric = (a, b) => b.localeCompare(a, undefined, { numeric: true });
  for (const profile of list(base)) {
    const versions = join(base, profile, 'claude-code');
    for (const version of list(versions).sort(numeric)) {
      for (const build of list(join(versions, version))) {
        const exe = join(versions, version, build, 'claude.exe');
        if (existsSync(exe)) return exe;
      }
    }
  }
  return null;
}

function installPlugin() {
  const commands = [
    ['plugin', 'marketplace', 'add', MARKETPLACE, '--scope', 'user'],
    ['plugin', 'install', PLUGIN, '--scope', 'user'],
  ];
  const show = (bin) => commands.map((args) => `  ${bin} ${args.join(' ')}`).join('\n');
  const claude = dryRun ? null : findClaude();
  if (!claude) return `plugin: run these once:\n${show('claude')}`;
  return commands
    .map((args) => {
      const { status, stdout, stderr } = exec(claude, args);
      return `plugin: ${args.slice(0, 3).join(' ')} -> ${status === 0 ? 'ok' : `exit ${status}: ${(stderr || stdout).trim()}`}`;
    })
    .join('\n');
}

console.log(FILES.map(syncFile).join('\n'));
if (!flags.has('--no-plugin')) console.log(installPlugin());
