import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');

export const exec = (bin, args) => spawnSync(bin, args, { encoding: 'utf8' });

export function findClaude() {
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

export function sameContent(name, a, b) {
  if (!name.endsWith('.json')) return a.equals(b);
  try {
    return JSON.stringify(canonical(JSON.parse(a))) === JSON.stringify(canonical(JSON.parse(b)));
  } catch {
    return false;
  }
}
