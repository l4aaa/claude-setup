# claude-setup

My Claude Code setup: a plugin marketplace plus global config, kept in sync across devices.

- `.claude-plugin/marketplace.json` — marketplace `l4aaa-toolkit`
- `plugins/guardrails` — hooks that block access to secrets and risky git operations (merging, pushing to main, force-push, destructive deletes)
- `config/CLAUDE.md`, `config/settings.json` — global instructions and settings, copied to `~/.claude`

## Install on a device

Requires [Node.js](https://nodejs.org) 20+ and Claude Code.

```sh
git clone git@github.com:l4aaa/claude-setup.git
cd claude-setup
node install.mjs --diff   # preview
node install.mjs          # install (backs up changed files as *.bak-<time>)
```

The installer overwrites `~/.claude/CLAUDE.md` and `~/.claude/settings.json`, and never touches `settings.local.json` or any session data. Put per-machine overrides in `settings.local.json`. If `claude` isn't found it prints the two plugin commands to run.

The marketplace auto-updates in the background, so merged changes to the hooks reach every device. Pull the repo and re-run the installer to update the config files.

Verify a device with `node scripts/check.mjs`. It checks that the config matches the repo, that the plugin is installed and enabled, and that each hook runs and returns the expected exit code. Run it from inside Claude Code to test the same PATH the hooks get; if `node` is missing there, the hooks fail open and the check reports it.

To install only the plugin, in Claude Code:

```
/plugin install guardrails --marketplace l4aaa/claude-setup
```

## Develop

```sh
node --test
node scripts/validate.mjs
node scripts/check.mjs
```

Changes go through pull requests to `main`; CI must pass.
