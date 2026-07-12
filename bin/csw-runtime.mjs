#!/usr/bin/env node
// CSW goal-runtime CLI. A thin, machine-friendly wrapper around runtime.mjs that
// hooks and the model use to create goals, capture evidence, steer, and complete.
//
// Subcommands:
//   init --objective <s> (--criteria <block> | --criteria-file <path>)
//   show                          print current state JSON
//   status                        print { done, reasons }
//   verify --id <C0NN> [--timeout-ms N] -- <argv...>
//   artifact --id <C0NN> --path <path> --summary <text>
//   evidence --id <C0NN> --evidence <s> [--status fail|blocked|pending]
//   blocker add --id <id> --reason <s>
//   blocker resolve --id <id>
//   steer --text <s>              exit 0 accepted, exit 3 refused (weakening)
//   complete                      exit 0 if completed, exit 1 if gates unmet
//   clear                         abandon the active goal (escape hatch)
//
// Exit codes: 0 ok, 1 gate/operation failure, 2 usage error, 3 steering refused.

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as rt from "../runtime/src/runtime.mjs";
import { redactObject } from "../runtime/src/redact.mjs";

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = i + 1 < argv.length && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      f[key] = val;
    }
  }
  return f;
}

function out(obj) {
  process.stdout.write(JSON.stringify(redactObject(obj), null, 2) + "\n");
}

export function main(argv, cwd = process.cwd()) {
  const [cmd, ...rest] = argv;
  const f = parseFlags(rest);
  try {
    switch (cmd) {
      case "init": {
        const criteriaText = f["criteria-file"] ? readFileSync(f["criteria-file"], "utf8") : f.criteria;
        if (!criteriaText) return fail2("init requires --criteria or --criteria-file");
        const s = rt.initGoal({ objective: f.objective, criteriaText }, cwd);
        out({ ok: true, objective: s.objective, criteria: s.criteria.map((c) => c.id) });
        return 0;
      }
      case "show": {
        out(rt.getState(cwd) ?? { error: "no active goal" });
        return 0;
      }
      case "status": {
        out(rt.status(cwd));
        return 0;
      }
      case "evidence": {
        if (typeof f.id !== "string") return fail2("evidence requires --id <C0NN>");
        if (typeof f.evidence !== "string") return fail2("evidence requires --evidence <text>");
        const c = rt.captureEvidence({ id: f.id, evidence: f.evidence, status: f.status || "pass" }, cwd);
        out({ ok: true, id: c.id, status: c.status });
        return 0;
      }
      case "verify": {
        const separator = rest.indexOf("--");
        if (separator < 0 || separator === rest.length - 1) return fail2("verify requires -- <argv>");
        const verifyFlags = parseFlags(rest.slice(0, separator));
        if (typeof verifyFlags.id !== "string") return fail2("verify requires --id <C0NN>");
        const commandArgv = rest.slice(separator + 1);
        if (!commandArgv[0]) return fail2("verify requires a nonempty executable after --");
        if (verifyFlags["timeout-ms"] !== undefined) {
          const timeout = Number(verifyFlags["timeout-ms"]);
          if (!Number.isInteger(timeout) || timeout < 1 || timeout > 300000) return fail2("verify --timeout-ms must be an integer from 1 to 300000");
        }
        const c = rt.verifyCriterion({ id: verifyFlags.id, timeoutMs: verifyFlags["timeout-ms"], argv: commandArgv }, cwd);
        out({ ok: c.status === "pass", id: c.id, status: c.status, receipt: c.receipt });
        return c.status === "pass" ? 0 : 1;
      }
      case "artifact": {
        if (typeof f.id !== "string") return fail2("artifact requires --id <C0NN>");
        if (typeof f.path !== "string") return fail2("artifact requires --path <path>");
        if (typeof f.summary !== "string") return fail2("artifact requires --summary <text>");
        const c = rt.captureArtifact({ id: f.id, path: f.path, summary: f.summary }, cwd);
        out({ ok: true, id: c.id, status: c.status, receipt: c.receipt });
        return 0;
      }
      case "blocker": {
        const [sub] = rest;
        if (sub === "add") {
          if (typeof f.id !== "string") return fail2("blocker add requires --id <id>");
          if (typeof f.reason !== "string") return fail2("blocker add requires --reason <text>");
          rt.addBlocker({ id: f.id, reason: f.reason }, cwd); out({ ok: true }); return 0;
        }
        if (sub === "resolve") {
          if (typeof f.id !== "string") return fail2("blocker resolve requires --id <id>");
          rt.resolveBlocker({ id: f.id }, cwd); out({ ok: true }); return 0;
        }
        return fail2("blocker requires 'add' or 'resolve'");
      }
      case "steer": {
        if (typeof f.text !== "string") return fail2("steer requires --text <instruction>");
        const r = rt.steer({ text: f.text }, cwd);
        out(r);
        return r.accepted ? 0 : 3;
      }
      case "clear": {
        out(rt.clearGoal(cwd));
        return 0;
      }
      case "complete": {
        const s = rt.complete(cwd);
        out({ ok: true, completed: true, at: s.completedAt });
        return 0;
      }
      default:
        return fail2(`unknown command: ${cmd ?? "(none)"}`);
    }
  } catch (err) {
    out({ ok: false, error: err.message, reasons: err.reasons });
    return 1;
  }
}

function fail2(msg) {
  out({ ok: false, error: msg });
  return 2;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}
if (isMainModule()) process.exit(main(process.argv.slice(2)));
