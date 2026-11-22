import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { isMain, run, toPosix, tokenize } from './lib.mjs';

const PROTECTED = new Set(['main', 'master']);
const GH_RULES = [
  [/\bgh\s+pr\s+merge\b/, 'merging a pull request'],
  [/\bgh\s+pr\s+review\b.*(--approve|\s-a\b)/, 'approving a pull request'],
  [/\bgh\s+api\b.*(\/merge\b|mergePullRequest|enablePullRequestAutoMerge)/i, 'merging via the GitHub API'],
  [/\bgh\s+api\b.*(-X|--method)\s+delete\b/i, 'a DELETE call to the GitHub API'],
  [/\bgh\s+repo\s+(delete|archive)\b/, 'deleting or archiving a repository'],
];
const GIT_OPTS_WITH_ARG = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);
const RM_UNIX = new Set(['rm', 'rmdir']);
const RM_ALL = new Set([...RM_UNIX, 'remove-item', 'ri', 'rd', 'del', 'erase']);

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['-C', cwd ?? process.cwd(), 'rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function gitCall(tokens) {
  const i = tokens.findIndex((t) => /(^|\/)git(\.exe)?$/i.test(toPosix(t)));
  if (i < 0) return null;
  let j = i + 1;
  while (tokens[j]?.startsWith('-')) j += GIT_OPTS_WITH_ARG.has(tokens[j]) ? 2 : 1;
  return { sub: tokens[j], args: tokens.slice(j + 1) };
}

function pushReason(args, branch) {
  if (args.some((a) => /^--(force|mirror|delete|prune)/.test(a) || /^-[a-zA-Z]*[fd][a-zA-Z]*$/.test(a))) {
    return 'force-pushing or deleting remote refs';
  }
  const [, ...refs] = args.filter((a) => !a.startsWith('-'));
  const targets = refs.length ? refs : ['HEAD'];
  for (const ref of targets) {
    if (ref.startsWith('+')) return 'force-pushing';
    if (ref.startsWith(':')) return 'deleting a remote ref';
    const dest = ref === 'HEAD' ? branch() : ref.split(':').pop().replace(/^refs\/heads\//, '');
    if (PROTECTED.has(dest)) return `pushing to ${dest}`;
  }
  return undefined;
}

function gitReason({ sub, args }, branch) {
  if (sub === 'push') return pushReason(args, branch);
  if (sub === 'merge' && !args.some((a) => /^--(abort|quit)$/.test(a)) && PROTECTED.has(branch())) {
    return `merging into ${branch()}`;
  }
  if (sub === 'reset' && args.includes('--hard')) return 'git reset --hard';
  if (sub === 'clean' && args.some((a) => /^-[a-zA-Z]*f/.test(a) || a === '--force')) return 'git clean --force';
  return undefined;
}

function isOutside(path, cwd) {
  const p = toPosix(path).toLowerCase();
  if (p === '/' || p === '~' || p.startsWith('~/') || /^(\$home|\$env:userprofile|%userprofile%)/.test(p)) return true;
  if (p === '..' || p.startsWith('../')) return true;
  if (!/^(\/|[a-z]:\/)/.test(p)) return false;
  const inside = (dir) => p === dir || p.startsWith(`${dir}/`);
  const bases = [toPosix(tmpdir()).toLowerCase(), '/tmp'];
  if (cwd) bases.push(toPosix(cwd).toLowerCase().replace(/\/$/, ''));
  return !bases.some(inside);
}

function rmReason(tokens, cwd) {
  const i = tokens.findIndex((t) => RM_ALL.has(toPosix(t).split('/').pop().toLowerCase()));
  if (i < 0) return undefined;
  const verb = toPosix(tokens[i]).split('/').pop().toLowerCase();
  const rest = tokens.slice(i + 1);
  const recursive = rest.some((f) =>
    /^\/s$/i.test(f) ||
    (RM_UNIX.has(verb) ? /^-[a-zA-Z]*[rR][a-zA-Z]*$|^--recursive$/.test(f) : /^-recurse$/i.test(f)),
  );
  if (!recursive) return undefined;
  const target = rest.filter((t) => !t.startsWith('-') && !/^\/[a-z]$/i.test(t)).find((t) => isOutside(t, cwd));
  return target ? `recursive delete of "${target}" outside the project` : undefined;
}

function segmentReason(segment, cwd, branchOf) {
  const text = segment.replace(/\s+/g, ' ');
  const gh = GH_RULES.find(([re]) => re.test(text));
  if (gh) return gh[1];
  const tokens = tokenize(segment);
  const git = gitCall(tokens);
  let cached;
  const branch = () => (cached ??= branchOf(cwd));
  return (git && gitReason(git, branch)) || rmReason(tokens, cwd);
}

export function check(payload, branchOf = currentBranch) {
  const command = payload?.tool_input?.command;
  if (typeof command !== 'string') return undefined;
  for (const segment of command.split(/[;&|\n]+/)) {
    const reason = segmentReason(segment, payload.cwd, branchOf);
    if (reason) return `Blocked by guardrails: ${reason}. A human must do this; ask the user.`;
  }
  return undefined;
}

if (isMain(import.meta.url)) run(check);
