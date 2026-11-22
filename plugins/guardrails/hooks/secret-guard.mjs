import { isMain, run, toPosix, tokenize } from './lib.mjs';

const TEMPLATE = /\.(example|sample|template|dist)$/i;
const SECRET = [
  /(^|\/)\.env(\.[^/]+)?$/i,
  /\.(pem|key|p12|pfx|jks|keystore)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i,
  /(^|\/)\.(ssh|aws|gnupg)(\/|$)/i,
  /(^|\/)(credentials|credentials\.json|\.credentials\.json|\.netrc|\.git-credentials|\.claude\.json)$/i,
];
const PATH_FIELDS = ['file_path', 'path', 'notebook_path'];

export function isSecretPath(path) {
  const p = toPosix(path);
  return !TEMPLATE.test(p) && SECRET.some((re) => re.test(p));
}

export function check(payload) {
  const input = payload?.tool_input ?? {};
  const fromPaths = PATH_FIELDS.map((f) => input[f])
    .filter((v) => typeof v === 'string')
    .find(isSecretPath);
  const fromCommand =
    typeof input.command === 'string'
      ? tokenize(input.command)
          .flatMap((t) => t.split('='))
          .find(isSecretPath)
      : undefined;
  const hit = fromPaths ?? fromCommand;
  return hit
    ? `Blocked by guardrails: "${hit}" looks like a secret or credential file. Do not read, write, or print it; ask the user instead.`
    : undefined;
}

if (isMain(import.meta.url)) run(check);
