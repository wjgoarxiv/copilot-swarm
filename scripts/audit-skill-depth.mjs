#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { scanText } from "./scanner-core.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRoot = join(scriptDir, "..");

function lineCount(text) {
  return text.split("\n").length - Number(text.endsWith("\n"));
}

function markdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...markdownFiles(path));
    else if (entry.endsWith(".md")) files.push(path);
  }
  return files;
}

function frontmatterName(text) {
  const match = text.match(/^---\n[\s\S]*?^name:\s*([^\n]+)$/m);
  return match?.[1]?.trim() ?? null;
}

function frontmatterFields(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1] ?? "";
  return new Map(
    block
      .split("\n")
      .map((line) => line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim()]),
  );
}

function contentSignals(text) {
  const fenceMarkers = [...text.matchAll(/^```/gm)].length;
  return {
    words: (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length,
    headings: (text.match(/^#{1,6}\s+/gm) ?? []).length,
    codeFences: Math.floor(fenceMarkers / 2),
    checklistItems: (text.match(/^\s*[-*]\s+\[[ xX]\]\s+/gm) ?? []).length,
    tableRows: (text.match(/^\s*\|.*\|\s*$/gm) ?? []).length,
  };
}

function normalizedParagraphs(text) {
  const withoutCode = text
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "");
  return withoutCode
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim().toLowerCase())
    .filter((paragraph) => paragraph.length >= 100)
    .filter((paragraph) => !/^(?:#{1,6}\s|[-*|>]\s?|\d+[.)]\s)/.test(paragraph));
}

function markdownLinks(text) {
  return [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().replace(/^<|>$/g, ""))
    .filter((target) => target && !target.startsWith("#") && !/^[a-z][a-z0-9+.-]*:/i.test(target))
    .map((target) => target.split("#", 1)[0])
    .filter((target) => target.endsWith(".md"));
}

const compatibilityPatterns = [
  [/\bbackground_output\s*\(/g, "foreign orchestration API background_output("],
  [/\btask\s*\(\s*subagent_type\b/g, "foreign orchestration API task(subagent_type"],
  [/\bcall_(?:agent|worker)\s*\(/g, "foreign orchestration API call_agent/call_worker("],
  [/\bteam_(?:create|delete|message|broadcast)\s*\(/g, "foreign team API"],
  [/\bmulti_agent_v1\b/g, "foreign multi-agent schema multi_agent_v1"],
  [/\blsp_diagnostics\s*\(/g, "invented LSP operation lsp_diagnostics("],
  [/(?<![/\w.-])csw-runtime\s+(?:init|show|status|verify|artifact|evidence|blocker|steer|complete|clear)\b/g, "bare runtime command without injected absolute invocation"],
];

function compatibilityIssues(text, label) {
  const issues = [];
  for (const [pattern, message] of compatibilityPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) issues.push(`${label}: ${message}`);
  }
  return issues;
}

function inside(root, path) {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export function auditSkillPackages(root = defaultRoot) {
  const skillsDir = join(root, "skills");
  const directories = readdirSync(skillsDir)
    .filter((name) => statSync(join(skillsDir, name)).isDirectory())
    .sort();

  const packages = [];
  const issues = [];
  const paragraphFiles = new Map();
  let paragraphOccurrences = 0;

  for (const name of directories) {
    const dir = join(skillsDir, name);
    const mainPath = join(dir, "SKILL.md");
    if (!existsSync(mainPath)) {
      issues.push(`${name}: missing SKILL.md`);
      continue;
    }

    const main = readFileSync(mainPath, "utf8");
    const fields = frontmatterFields(main);
    if (frontmatterName(main) !== name) issues.push(`${name}: frontmatter name mismatch`);
    if (!fields.get("description")) issues.push(`${name}: frontmatter description missing`);
    if ((fields.get("description") ?? "").length > 1024) issues.push(`${name}: frontmatter description exceeds 1024 characters`);
    for (const field of fields.keys()) {
      if (!new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]).has(field)) {
        issues.push(`${name}: unsupported frontmatter field ${field}`);
      }
    }
    if (scanText(main).length > 0) issues.push(`${name}: source trace in SKILL.md`);
    issues.push(...compatibilityIssues(main, `${name}/SKILL.md`));

    const refsDir = join(dir, "references");
    const refs = existsSync(refsDir) ? markdownFiles(refsDir) : [];
    let referenceLines = 0;
    const allFiles = [mainPath, ...refs];
    const signals = { words: 0, headings: 0, codeFences: 0, checklistItems: 0, tableRows: 0 };

    for (const path of allFiles) {
      const text = readFileSync(path, "utf8");
      const fileSignals = contentSignals(text);
      for (const key of Object.keys(signals)) signals[key] += fileSignals[key];
      for (const paragraph of normalizedParagraphs(text)) {
        paragraphOccurrences += 1;
        if (!paragraphFiles.has(paragraph)) paragraphFiles.set(paragraph, new Set());
        paragraphFiles.get(paragraph).add(relative(root, path));
      }
      if (path !== mainPath) {
        const label = relative(refsDir, path);
        referenceLines += lineCount(text);
        if (lineCount(text) >= 80 && (fileSignals.headings < 2 || (fileSignals.codeFences + fileSignals.tableRows + fileSignals.checklistItems === 0))) {
          issues.push(`${name}: shallow long reference ${label}`);
        }
        if (scanText(text).length > 0) issues.push(`${name}: source trace in ${label}`);
        issues.push(...compatibilityIssues(text, `${name}/references/${label}`));
      }
    }

    const visited = new Set([mainPath]);
    const queue = [{ path: mainPath, depth: 0 }];
    let maxReferenceDepth = 0;
    while (queue.length > 0) {
      const current = queue.shift();
      const text = readFileSync(current.path, "utf8");
      for (const target of markdownLinks(text)) {
        const linkedPath = resolve(dirname(current.path), target);
        if (!inside(dir, linkedPath)) {
          issues.push(`${name}: local link escapes skill root ${target}`);
          continue;
        }
        if (!existsSync(linkedPath)) {
          issues.push(`${name}: broken local link ${relative(dir, linkedPath)}`);
          continue;
        }
        if (!visited.has(linkedPath)) {
          visited.add(linkedPath);
          const depth = current.depth + 1;
          maxReferenceDepth = Math.max(maxReferenceDepth, depth);
          queue.push({ path: linkedPath, depth });
        }
      }
    }

    const reachableReferences = refs.filter((path) => visited.has(path));
    for (const path of refs) {
      if (!visited.has(path)) issues.push(`${name}: unreachable reference ${relative(refsDir, path)}`);
    }

    const mainLines = lineCount(main);
    packages.push({
      name,
      mainLines,
      referenceFiles: refs.length,
      reachableReferenceFiles: reachableReferences.length,
      maxReferenceDepth,
      referenceLines,
      totalLines: mainLines + referenceLines,
      ...signals,
    });
  }

  const totals = packages.reduce(
    (sum, item) => ({
      skills: sum.skills + 1,
      mainLines: sum.mainLines + item.mainLines,
      referenceFiles: sum.referenceFiles + item.referenceFiles,
      referenceLines: sum.referenceLines + item.referenceLines,
      totalLines: sum.totalLines + item.totalLines,
      words: sum.words + item.words,
      headings: sum.headings + item.headings,
      codeFences: sum.codeFences + item.codeFences,
      checklistItems: sum.checklistItems + item.checklistItems,
      tableRows: sum.tableRows + item.tableRows,
    }),
    {
      skills: 0,
      mainLines: 0,
      referenceFiles: 0,
      referenceLines: 0,
      totalLines: 0,
      words: 0,
      headings: 0,
      codeFences: 0,
      checklistItems: 0,
      tableRows: 0,
    },
  );

  totals.paragraphs = paragraphOccurrences;
  totals.uniqueParagraphs = paragraphFiles.size;
  totals.uniqueParagraphRatio = paragraphOccurrences === 0 ? 1 : paragraphFiles.size / paragraphOccurrences;
  for (const files of paragraphFiles.values()) {
    if (files.size >= 3) {
      issues.push(`suite: repeated long paragraph in ${files.size} files: ${[...files].join(", ")}`);
    }
  }

  return { packages, totals, issues };
}

export function renderMarkdown(report) {
  const lines = [
    "# Skill depth audit",
    "",
    "| Skill | Main lines | Reachable refs | Reference lines | Package lines | Words | Code examples |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.packages.map(
      (item) => `| ${item.name} | ${item.mainLines} | ${item.reachableReferenceFiles}/${item.referenceFiles} | ${item.referenceLines} | ${item.totalLines} | ${item.words} | ${item.codeFences} |`,
    ),
    `| **Total** | **${report.totals.mainLines}** | **${report.totals.referenceFiles}/${report.totals.referenceFiles}** | **${report.totals.referenceLines}** | **${report.totals.totalLines}** | **${report.totals.words}** | **${report.totals.codeFences}** |`,
    "",
    `Unique long paragraphs: ${report.totals.uniqueParagraphs}/${report.totals.paragraphs} (${report.totals.uniqueParagraphRatio.toFixed(3)})`,
    "",
    `Issues: ${report.issues.length}`,
  ];
  if (report.issues.length > 0) lines.push("", ...report.issues.map((issue) => `- ${issue}`));
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = auditSkillPackages();
  const json = process.argv.includes("--json");
  process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
  process.exitCode = report.issues.length === 0 ? 0 : 1;
}
