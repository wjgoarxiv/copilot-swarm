// Structured steering guard. Refuses instructions that weaken completion criteria
// (skipping/bypassing/auto-completing tests, QA, or review). Legitimate steering
// (adding scope, revising wording with evidence) is allowed by the caller.

// Phrases that target completion on their own (no separate gate noun needed).
const SELF_SUFFICIENT = /\b(auto[-\s]?complete|mark\s+(?:it\s+|this\s+)?complete|force\s+complete|complete\s+faster|lower\s+the\s+bar|call\s+it\s+done|treat\s+(?:it|this)\s+as\s+done|good\s+enough|just\s+ship\s+it|ship\s+it|(?:ship|proceed|continue|move\s+on)\s+without|set\s+.*\bto\s+pass\b)\b/i;
// A weakening verb that only counts when paired with a gate noun.
const WEAKEN_VERB = /\b(skip(?:s|ped|ping)?|bypass(?:es|ed|ing)?|weaken|disable|remove|omit|ignore|short[-\s]?circuit|fake|pretend|override|circumvent|sidestep)\b/i;
// Negation / dismissal that, paired with a gate noun, weakens it.
const NEG_DISMISS = /\b(no\s+need\s+to|don'?t|do\s+not|not\s+required|not\s+necessary|aren'?t\s+required|isn'?t\s+required|no\s+longer\s+(?:need|required)|optional|unnecessary|overkill|not\s+needed)\b/i;
const GATE_NOUN = /\b(test|tests|testing|verification|verify|review|reviewer|quality\s*gate|qa|manual\s*qa|criteri\w+|completion|evidence)\b/i;

// Exact protective clauses are removed before weakening checks. The rest of the
// prompt is still classified, so a protective prefix cannot hide a later bypass.
const PROTECTIVE_SPANS = [
  /\bdo\s+not\s+weaken,\s*skip,?\s*or\s+auto[-\s]?complete\s+any\s+success\s+criterion\b(?!\s*(?:[,;:]\s*)?(?:if|unless|except|when|where|provided(?:\s+that)?|only\s+if|as\s+long\s+as)\b)/gi,
  /\bdo\s+not\s+stop\s+until\s+(?=[^.!?;\n]{0,120}\b(?:test|tests|testing|verification|review|quality\s*gate|qa|manual\s*qa|criteri\w+|completion|evidence)\b)[^.!?;\n]{0,120}\bpasses?\b(?!\s*(?:[,;:]\s*)?(?:if|unless|except|when|where|provided(?:\s+that)?|only\s+if|as\s+long\s+as)\b)/gi,
  /\bdo\s+not\s+skip\s+tests\b(?!\s*(?:[,;:]\s*)?(?:if|unless|except|when|where|provided(?:\s+that)?|only\s+if|as\s+long\s+as)\b)/gi,
  /\bnever\s+skip\s+tests\b(?!\s*(?:[,;:]\s*)?(?:if|unless|except|when|where|provided(?:\s+that)?|only\s+if|as\s+long\s+as)\b)/gi,
  /\bdo\s+not\s+forget\s+to\s+run\s+tests\b(?!\s*(?:[,;:]\s*)?(?:if|unless|except|when|where|provided(?:\s+that)?|only\s+if|as\s+long\s+as)\b)/gi,
];

function maskProtectiveSpans(text) {
  return PROTECTIVE_SPANS.reduce((rest, pattern) => rest.replace(pattern, " "), text);
}

const TEMPORAL_BOUNDARY = /\b(?:after|before|during|while|when|once|following|upon)\b/i;
const NEW_PREDICATE = /\b(?:and|or|but|however|then|while)\s+(?:then\s+)?(?:stop|run|review|verify|inspect|check|clean|remove|delete|write|create|commit|complete|record|report|continue|proceed|archive|preserve|skip(?:s|ped|ping)?|bypass(?:es|ed|ing)?|weaken|disable|omit|ignore|override|circumvent|sidestep)\b/i;
const COPULAR_LINK = /^(?:\s|are|is|was|were|be|being|been|remain|remains|seem|seems|should|can|may|must|will|would|could)*$/i;
const NEGATED_COPULAR_LINK = /^(?=[\s\S]*\b(?:not|never)\b)(?:\s|are|is|was|were|be|being|been|remain|remains|seem|seems|should|can|may|must|will|would|could|not|never)*$/i;
const CONDITIONAL_QUALIFIER = /\b(?:if|unless|except|when|where|provided(?:\s+that)?|only\s+if|as\s+long\s+as)\b/i;

function matches(pattern, text) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...text.matchAll(new RegExp(pattern.source, flags))].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function crossesRelationshipBoundary(segment) {
  return segment.includes(",") || TEMPORAL_BOUNDARY.test(segment) || NEW_PREDICATE.test(segment);
}

function forwardPair(sentence, triggers, gates) {
  for (const trigger of triggers) {
    for (const gate of gates) {
      if (gate.start < trigger.end) continue;
      const relation = sentence.slice(trigger.end, gate.end);
      if (!crossesRelationshipBoundary(relation)) return { trigger: trigger.text, gate: gate.text };
    }
  }
  return null;
}

function findGateWeakening(text) {
  const sentences = text.split(/[.!?;\n]+/);
  for (const sentence of sentences) {
    const gates = matches(GATE_NOUN, sentence);
    const verbs = matches(WEAKEN_VERB, sentence);
    const negations = matches(NEG_DISMISS, sentence);
    const verbPair = forwardPair(sentence, verbs, gates);
    if (verbPair) return verbPair;
    const negationPair = forwardPair(sentence, negations, gates);
    if (negationPair) return negationPair;
    for (const gate of gates) {
      for (const verb of verbs) {
        if (verb.start < gate.end) continue;
        const link = sentence.slice(gate.end, verb.start);
        if (COPULAR_LINK.test(link) ||
          (NEGATED_COPULAR_LINK.test(link) && CONDITIONAL_QUALIFIER.test(sentence.slice(verb.end)))) {
          return { trigger: verb.text, gate: gate.text };
        }
      }
      for (const negation of negations) {
        if (negation.start < gate.end) continue;
        const link = sentence.slice(gate.end, negation.start);
        if (COPULAR_LINK.test(link) ||
          (NEGATED_COPULAR_LINK.test(link) && CONDITIONAL_QUALIFIER.test(sentence.slice(negation.end)))) {
          return { trigger: negation.text, gate: gate.text };
        }
      }
    }
  }
  return null;
}

/**
 * Classify a steering instruction.
 * @returns { weakening: boolean, verb?: string, gate?: string, reason?: string }
 */
export function classifySteering(text) {
  const s = maskProtectiveSpans(String(text || ""));
  const self = s.match(SELF_SUFFICIENT);
  if (self) {
    return {
      weakening: true,
      verb: self[0],
      gate: "completion",
      reason: `Refused: instruction "${self[0]}" tries to bypass the completion gate. Completion criteria, tests, manual QA, and review cannot be skipped or auto-completed.`,
    };
  }
  const paired = findGateWeakening(s);
  if (paired) {
    const { trigger, gate } = paired;
    return {
      weakening: true,
      verb: trigger,
      gate,
      reason: `Refused: instruction tries to weaken a completion gate ("${gate}" via "${trigger}"). Completion criteria, tests, manual QA, and review cannot be skipped, dismissed, or auto-completed.`,
    };
  }
  return { weakening: false };
}

export const isWeakening = (text) => classifySteering(text).weakening;
