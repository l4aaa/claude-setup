# Global instructions

## Code
- Write the least code that fully solves the task: clean, minimal, modern. No speculative features, abstractions, or configuration.
- Prefer simplifying or deleting over adding. Reuse what already exists before writing new code.
- Don't assume a stack. Inspect the project first and match its language, tooling, style, and conventions.
- Ask before adding a dependency, framework, or new abstraction layer.
- Don't write code comments. If code needs one, it isn't clear enough: rename, extract, or simplify instead.

## Verification
- Decide how the work can be checked (test, typecheck, build, run), do it, and show the real output. Don't claim success without evidence.
- For a bug: reproduce it with a failing test first when a test setup exists, and fix the root cause, not the symptom.
- If a check fails or was skipped, say so plainly.

## Git workflow
- Work in a git worktree on a feature branch. Never commit directly to main or master.
- When done, push the branch, open a PR to main with `gh pr create`, then stop. Never merge, approve, enable auto-merge, or force-push. A human merges.
- Keep commits small and focused; explain why in the message.

## Safety
- Never read, write, or print `.env` files, private keys, or credentials. If one is needed, ask the user. Hooks enforce this; don't work around them.
- Ask before destructive or hard-to-reverse actions.

## Per-project checks
To make Claude run a project's checks before finishing, add a `Stop` hook to that project's `.claude/settings.json` that runs its test or typecheck command and exits 2 on failure.
