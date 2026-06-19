// Deterministic redaction helpers for state, ledger, hook, and MCP surfaces.

const REDACTIONS = [
  { name: "bearer", re: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, repl: "Bearer [REDACTED:bearer]" },
  { name: "github", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g, repl: "[REDACTED:github-token]" },
  { name: "github", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, repl: "[REDACTED:github-token]" },
  { name: "slack", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, repl: "[REDACTED:slack-token]" },
  { name: "openai", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g, repl: "[REDACTED:api-key]" },
  { name: "api-key", re: /\b[A-Za-z0-9_-]*api[_-]?key\s*[:=]\s*['\"]?[^'\"\s,;}]{8,}/gi, repl: (m) => keyValueRedaction(m, "api-key") },
  { name: "secret", re: /\b(?:password|passwd|pwd|token|secret|client_secret|access_token|refresh_token|copilot_token|github_token|gh_token|npm_token)\s*[:=]\s*['\"]?[^'\"\s,;}]{6,}/gi, repl: (m) => keyValueRedaction(m, "secret") },
  { name: "env-secret", re: /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|GH_TOKEN|NPM_TOKEN|COPILOT_TOKEN|SLACK_BOT_TOKEN|SLACK_APP_TOKEN|AWS_SECRET_ACCESS_KEY|GOOGLE_API_KEY)=([^\s\n]{6,})/g, repl: (m) => keyValueRedaction(m, "env") },
];

function keyValueRedaction(match, label) {
  const sep = match.includes(":") ? ":" : "=";
  const [key] = match.split(sep, 1);
  return `${key}${sep}[REDACTED:${label}]`;
}

export function redactText(value) {
  let out = String(value ?? "");
  for (const { re, repl } of REDACTIONS) out = out.replace(re, repl);
  return out;
}

export function sanitizeLine(value, max = 200) {
  const oneLine = redactText(value).replace(/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").replace(/[\r\n\t\0\x01-\x1f\x7f]+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, Math.max(0, max - 1))}…` : oneLine;
}

export function redactObject(value) {
  if (typeof value === "string") return redactText(value);
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redactObject(v));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = redactObject(v);
  return out;
}

export function safeMode(env = process.env) {
  return /^(1|true|yes|on)$/i.test(String(env.CSW_SAFE_MODE || ""));
}

const SECRET_ENV = /(?:TOKEN|SECRET|PASSWORD|PASSWD|PWD|KEY|COOKIE|SESSION|CREDENTIAL|AUTH)/i;
const ALLOWED_EXACT_ENV = new Set([
  "PATH", "HOME", "USER", "LOGNAME", "SHELL", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "TERM",
  "CSW_DISPATCH_CMD", "CSW_DISPATCH_TIMEOUT_MS", "CSW_DISPATCH_CONCURRENCY", "CSW_DISPATCH_MAX_DEPTH",
]);

export function workerEnv(base = process.env, depth) {
  const env = {};
  for (const [k, v] of Object.entries(base || {})) {
    if (SECRET_ENV.test(k)) continue;
    if (ALLOWED_EXACT_ENV.has(k) || k.startsWith("LC_")) env[k] = String(v);
  }
  env.CSW_DISPATCH_DEPTH = String(depth);
  return env;
}
