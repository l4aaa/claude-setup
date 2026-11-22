import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check } from '../plugins/guardrails/hooks/git-guard.mjs';

const run = (command, { cwd = '/proj', branch = 'feature' } = {}) =>
  check({ tool_name: 'Bash', cwd, tool_input: { command } }, () => branch);

const blockedOnFeature = [
  'gh pr merge 5 --squash',
  'gh  pr  merge --admin',
  'gh pr review 5 --approve',
  'gh api -X PUT repos/o/r/pulls/5/merge',
  'gh api graphql -f query=mergePullRequest',
  'gh repo delete o/r --yes',
  'git push --force origin feature',
  'git push -f',
  'git push --force-with-lease origin feature',
  'git push origin main',
  'git push origin HEAD:main',
  'git push origin feature:refs/heads/master',
  'git push origin +feature',
  'git push origin :feature',
  'git -C . push origin master',
  'echo ok && git push origin main',
  'git reset --hard HEAD~1',
  'git clean -fd',
  'rm -rf /',
  'rm -rf ~',
  'rm -rf ../other',
  'rm -rf /etc/stuff',
  'Remove-Item -Recurse -Force C:\\Users\\a',
];

const allowedOnFeature = [
  'git push -u origin worktree-x',
  'git push',
  'git push origin HEAD',
  'git push origin main:feature',
  'git status',
  'git merge main',
  'git commit -m "push to main later"',
  'gh pr create --base main --fill',
  'gh pr view 5',
  'rm -rf node_modules',
  'rm -rf /proj/dist',
  'rm -rf /tmp/scratch',
  'rm file.txt',
  'Remove-Item -Recurse -Force .\\dist',
  'npm test',
];

test('blocks risky commands', () => {
  for (const command of blockedOnFeature) assert.ok(run(command), command);
});

test('allows ordinary commands', () => {
  for (const command of allowedOnFeature) assert.equal(run(command), undefined, command);
});

test('protects the default branch when it is checked out', () => {
  const onMain = { branch: 'main' };
  assert.ok(run('git push', onMain));
  assert.ok(run('git push origin HEAD', onMain));
  assert.ok(run('git merge feature', onMain));
  assert.equal(run('git merge --abort', onMain), undefined);
});

test('handles Windows project paths', () => {
  const cwd = 'C:\\proj';
  assert.equal(run('rm -rf C:\\proj\\dist', { cwd }), undefined);
  assert.ok(run('rm -rf C:\\other\\dist', { cwd }));
});

test('ignores non-command input', () => {
  assert.equal(check({ tool_input: {} }), undefined);
  assert.equal(check(undefined), undefined);
});
