#!/usr/bin/env node
// CSW goal-runtime CLI. A thin, machine-friendly wrapper around runtime.mjs that
// hooks and the model use to create goals, capture evidence, steer, and complete.
//
// Subcommands:
//   init --objective <s> (--criteria <block> | --criteria-file <path>)
//   show                          print current state JSON
//   status                        print { done, reasons }
//   evidence --id <C0NN> --evidence <s> [--status pass|fail|blocked|pending]
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
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
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
      case "blocker": {
        const [sub] = rest;
        if (sub === "add") { rt.addBlocker({ id: f.id, reason: f.reason }, cwd); out({ ok: true }); return 0; }
        if (sub === "resolve") { rt.resolveBlocker({ id: f.id }, cwd); out({ ok: true }); return 0; }
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
