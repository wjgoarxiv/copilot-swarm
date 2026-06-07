// Structured steering guard. Refuses instructions that weaken completion criteria
// (skipping/bypassing/auto-completing tests, QA, or review). Legitimate steering
// (adding scope, revising wording with evidence) is allowed by the caller.

// Phrases that target completion on their own (no separate gate noun needed).
const SELF_SUFFICIENT = /\b(auto[-\s]?complete|mark\s+(?:it\s+|this\s+)?complete|force\s+complete|complete\s+faster|lower\s+the\s+bar|call\s+it\s+done|treat\s+(?:it|this)\s+as\s+done|good\s+enough|just\s+ship\s+it|ship\s+it|(?:ship|proceed|continue|move\s+on)\s+without|set\s+.*\bto\s+pass\b)\b/i;
// A weakening verb that only counts when paired with a gate noun.
const WEAKEN_VERB = /\b(skip|bypass|weaken|disable|remove|omit|ignore|short[-\s]?circuit|fake|pretend|override|circumvent|sidestep)\b/i;
// Negation / dismissal that, paired with a gate noun, weakens it.
const NEG_DISMISS = /\b(no\s+need\s+to|don'?t|do\s+not|not\s+required|not\s+necessary|aren'?t\s+required|isn'?t\s+required|no\s+longer\s+(?:need|required)|optional|unnecessary|overkill|not\s+needed)\b/i;
const GATE_NOUN = /\b(test|tests|testing|verification|verify|review|reviewer|quality\s*gate|qa|manual\s*qa|criteri\w+|completion|evidence)\b/i;

/**
 * Classify a steering instruction.
 * @returns { weakening: boolean, verb?: string, gate?: string, reason?: string }
 */
export function classifySteering(text) {
  const s = String(text || "");
  const self = s.match(SELF_SUFFICIENT);
  if (self) {
    return {
      weakening: true,
      verb: self[0],
      gate: "completion",
      reason: `Refused: instruction "${self[0]}" tries to bypass the completion gate. Completion criteria, tests, manual QA, and review cannot be skipped or auto-completed.`,
    };
  }
  const verb = s.match(WEAKEN_VERB);
  const neg = s.match(NEG_DISMISS);
  const gate = s.match(GATE_NOUN);
  const trigger = verb || neg;
  if (trigger && gate) {
    return {
      weakening: true,
      verb: trigger[0],
      gate: gate[0],
      reason: `Refused: instruction tries to weaken a completion gate ("${gate[0]}" via "${trigger[0]}"). Completion criteria, tests, manual QA, and review cannot be skipped, dismissed, or auto-completed.`,
    };
  }
  return { weakening: false };
}

export const isWeakening = (text) => classifySteering(text).weakening;
