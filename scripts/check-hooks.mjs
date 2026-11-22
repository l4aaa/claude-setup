import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SAMPLES = {
  'secret-guard.mjs': [
    [{ tool_name: 'Read', tool_input: { file_path: 'C:\\proj\\.env' } }, 2],
    [{ tool_name: 'Read', tool_input: { file_path: 'src/index.ts' } }, 0],
  ],
  'git-guard.mjs': [
    [{ tool_name: 'Bash', cwd: '/proj', tool_input: { command: 'gh pr merge 1' } }, 2],
    [{ tool_name: 'Bash', cwd: '/proj', tool_input: { command: 'git status' } }, 0],
  ],
};

export function checkHooks(pluginRoot) {
  const { hooks } = JSON.parse(readFileSync(join(pluginRoot, 'hooks', 'hooks.json'), 'utf8'));
  const commands = Object.values(hooks)
    .flat()
    .flatMap((group) => group.hooks.map((hook) => hook.command));

  return commands.flatMap((template) => {
    const command = template.replaceAll('${CLAUDE_PLUGIN_ROOT}', pluginRoot);
    const script = Object.keys(SAMPLES).find((name) => command.includes(name));
    if (!script) return [{ name: command, ok: false, detail: 'no check sample for this hook' }];
    return SAMPLES[script].map(([payload, expected]) => {
      const { status } = spawnSync(command, { shell: true, input: JSON.stringify(payload), encoding: 'utf8' });
      const detail = `got ${status}; hooks run node by name, so it must be on PATH`;
      return { name: `${script} exits ${expected}`, ok: status === expected, detail };
    });
  });
}
