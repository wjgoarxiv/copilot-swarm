#!/usr/bin/env node
// CSW dispatch MCP server — zero-dependency stdio transport.
//
// Implements just enough of the Model Context Protocol over stdio (newline-
// delimited JSON-RPC 2.0) to expose the swarm dispatch tools. No external
// runtime dependencies (the MCP SDK is intentionally NOT used).

import { runDispatch, toDispatchInput, TOOLS, PERMISSION_PROFILES, normalizePermissionProfile } from "./dispatch-core.mjs";
import { redactText } from "../../runtime/src/redact.mjs";

export const SERVER_INFO = { name: "csw-dispatch", version: "0.1.1" };
const SUPPORTED_PROTOCOL = "2024-11-05";

function applyArgProfile(argv = process.argv.slice(2), env = process.env) {
  const i = argv.indexOf("--permission-profile");
  if (i !== -1 && argv[i + 1]) env.CSW_PERMISSION_PROFILE = argv[i + 1];
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Handle one parsed JSON-RPC message. Returns a response object, or null for
 * notifications (no id) that need no reply. Exported for tests.
 * `deps` is forwarded to runDispatch (injectable spawn for tests).
 */
export async function handleMessage(msg, deps = {}) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return msg && msg.id !== undefined ? rpcError(msg.id ?? null, -32600, "Invalid Request") : null;
  }
  const isNotification = !("id" in msg); // per JSON-RPC, a notification omits id

  switch (msg.method) {
    case "initialize": {
      const requested = msg.params?.protocolVersion;
      return rpcResult(msg.id, {
        protocolVersion: typeof requested === "string" ? requested : SUPPORTED_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    }
    case "notifications/initialized":
    case "initialized":
      return null; // notification
    case "ping":
      return isNotification ? null : rpcResult(msg.id, {});
    case "tools/list":
      return rpcResult(msg.id, { tools: TOOLS.filter((t) => PERMISSION_PROFILES[normalizePermissionProfile()].tools.includes(t.name)) });
    case "tools/call": {
      const name = msg.params?.name;
      const args = msg.params?.arguments ?? {};
      try {
        if (!PERMISSION_PROFILES[normalizePermissionProfile()].tools.includes(name)) throw new Error(`tool disabled by permission profile: ${name}`);
        const input = toDispatchInput(name, args);
        const output = await runDispatch(input, deps);
        return rpcResult(msg.id, {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        });
      } catch (err) {
        return rpcResult(msg.id, {
          content: [{ type: "text", text: `dispatch error: ${redactText(err.message)}` }],
          isError: true,
        });
      }
    }
    default:
      return isNotification ? null : rpcError(msg.id, -32601, `Method not found: ${redactText(msg.method)}`);
  }
}

function writeMessage(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function runLoop() {
  let buffer = "";
  let pending = 0;
  let ended = false;
  const maybeExit = () => { if (ended && pending === 0) process.exit(0); };
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        writeMessage(rpcError(null, -32700, "Parse error"));
        continue;
      }
      const id = msg && typeof msg === "object" ? msg.id : undefined;
      pending++;
      handleMessage(msg)
        .then((res) => { if (res) writeMessage(res); })
        .catch((err) => {
          if (id !== undefined) writeMessage(rpcError(id, -32603, `Internal error: ${redactText(err.message)}`));
        })
        .finally(() => {
          pending--;
          maybeExit();
        });
    }
  });
  process.stdin.on("end", () => { ended = true; maybeExit(); });
}

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return fileURLToPath(import.meta.url) === process.argv[1];
  }
}
if (isMainModule()) runLoop();
applyArgProfile();
