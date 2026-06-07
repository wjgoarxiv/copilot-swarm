// Machine-parseable success-criteria block.
//
// Each criterion is one line:
//   C0NN | channel: <how it is exercised> | test: <automated test> | scenario: <observable behavior>
// e.g.
//   C001 | channel: http | test: test/api.test.mjs | scenario: POST /items returns 201
//
// `channel` is the manual-QA surface (http/cli/tmux/browser/...), `test` is the
// automated check, `scenario` is the observable PASS condition.

const ID_RE = /^C\d{2,}$/;
const FIELDS = ["channel", "test", "scenario"];

/** Parse a criteria block into structured criteria. Throws on malformed input. */
export function parseCriteria(text) {
  const out = [];
  const seen = new Set();
  const lines = String(text).split("\n");
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    if (!line.includes("|")) return; // prose, not a criterion line
    const parts = line.split("|").map((p) => p.trim());
    const id = parts[0];
    // A criterion candidate's first segment is a single bare token (no spaces).
    // Prose like "see foo | bar" has spaces in segment 0 and is skipped.
    if (/\s/.test(id)) return;
    if (!ID_RE.test(id)) {
      throw new Error(`line ${i + 1}: invalid criterion id "${id}" (expected C0NN)`);
    }
    if (seen.has(id)) throw new Error(`duplicate criterion id "${id}"`);
    seen.add(id);
    // Accumulate fields positionally so a value (esp. scenario) may itself contain
    // "|". A new field starts only at a known "channel:|test:|scenario:" segment;
    // anything else is continuation of the current field (pipe re-joined).
    const fields = {};
    let currentKey = null;
    for (const seg of parts.slice(1)) {
      const m = seg.match(/^(channel|test|scenario):\s*(.*)$/);
      if (m) {
        if (fields[m[1]] !== undefined) throw new Error(`criterion ${id}: duplicate field "${m[1]}"`);
        currentKey = m[1];
        fields[currentKey] = m[2].trim();
      } else if (currentKey) {
        fields[currentKey] = `${fields[currentKey]} | ${seg}`.trim();
      } else {
        throw new Error(`criterion ${id}: malformed segment "${seg}" (expected channel:/test:/scenario:)`);
      }
    }
    for (const f of FIELDS) {
      if (!fields[f]) throw new Error(`criterion ${id}: missing required field "${f}"`);
    }
    out.push({ id, channel: fields.channel, test: fields.test, scenario: fields.scenario, status: "pending", evidence: null });
  });
  if (out.length === 0) throw new Error("no criteria found (expected at least one C0NN line)");
  return out;
}

/** Serialize criteria back to the canonical one-line-per-criterion block. */
export function formatCriteria(criteria) {
  return criteria
    .map((c) => `${c.id} | channel: ${c.channel} | test: ${c.test} | scenario: ${c.scenario}`)
    .join("\n");
}
