import { BlueprintDiff, ProjectDetails, SavedBlueprint } from "@/types";

const VITAL_LABELS: Record<keyof ProjectDetails, string> = {
  projectName: "Project name",
  domain: "Domain / URL",
  hosting: "Hosting",
  repository: "Repository",
  authMethod: "Auth method",
  budgetRange: "Budget range",
  targetLaunch: "Target launch",
  primaryContact: "Primary contact",
};

function normaliseAnswer(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v.join(", ") : v;
}

/**
 * Computes a structured diff between two blueprints.
 * `a` is treated as the BASELINE, `b` as CURRENT.
 * Callers should sort by savedAt before calling so the older one is `a`.
 */
export function diffBlueprints(a: SavedBlueprint, b: SavedBlueprint): BlueprintDiff {
  // ── tech stack ─────────────────────────────────────────────────────────────
  const setA = new Set(a.analysis.suggestedTechStack);
  const setB = new Set(b.analysis.suggestedTechStack);

  const stackAdded = b.analysis.suggestedTechStack.filter((t) => !setA.has(t));
  const stackRemoved = a.analysis.suggestedTechStack.filter((t) => !setB.has(t));
  const stackUnchanged = a.analysis.suggestedTechStack.filter((t) => setB.has(t));

  // ── vitals ─────────────────────────────────────────────────────────────────
  const vitalKeys = Object.keys(VITAL_LABELS) as Array<keyof ProjectDetails>;
  const changedVitals = vitalKeys
    .filter((key) => {
      const before = (a.projectDetails[key] ?? "").trim();
      const after = (b.projectDetails[key] ?? "").trim();
      return before !== after && (before || after); // skip both-empty
    })
    .map((key) => ({
      key,
      label: VITAL_LABELS[key],
      before: (a.projectDetails[key] ?? "").trim(),
      after: (b.projectDetails[key] ?? "").trim(),
    }));

  // ── Q&A answers ────────────────────────────────────────────────────────────
  // Build a label lookup from both sets of questions
  const labelMap: Record<string, string> = {};
  for (const q of [...a.analysis.dynamicQuestions, ...b.analysis.dynamicQuestions]) {
    labelMap[q.id] = q.label;
  }

  const allIds = new Set([
    ...Object.keys(a.answers),
    ...Object.keys(b.answers),
  ]);

  const changedAnswers = Array.from(allIds)
    .map((id) => ({
      id,
      label: labelMap[id] ?? id,
      before: normaliseAnswer(a.answers[id]),
      after: normaliseAnswer(b.answers[id]),
    }))
    .filter(({ before, after }) => before !== after && (before || after));

  return {
    categoryChanged: a.analysis.primaryCategory !== b.analysis.primaryCategory,
    complexityChanged: a.analysis.complexity !== b.analysis.complexity,
    stackAdded,
    stackRemoved,
    stackUnchanged,
    changedVitals,
    changedAnswers,
  };
}

/** Renders a diff as a plain-text report for clipboard / email. */
export function diffToPlainText(
  a: SavedBlueprint,
  b: SavedBlueprint,
  diff: BlueprintDiff
): string {
  const lines: string[] = [];
  const fmt = (d: string) => new Date(d).toLocaleDateString();

  lines.push("SCOPE CHANGE REPORT");
  lines.push("=".repeat(40));
  lines.push(`Baseline:  ${fmt(a.savedAt)}  —  ${a.pitch.slice(0, 80)}`);
  lines.push(`Current:   ${fmt(b.savedAt)}  —  ${b.pitch.slice(0, 80)}`);
  lines.push("");

  lines.push("OVERVIEW");
  lines.push("-".repeat(40));
  if (diff.categoryChanged)
    lines.push(`Category:   ${a.analysis.primaryCategory}  →  ${b.analysis.primaryCategory}`);
  if (diff.complexityChanged)
    lines.push(`Complexity: ${a.analysis.complexity}  →  ${b.analysis.complexity}`);
  if (!diff.categoryChanged && !diff.complexityChanged)
    lines.push("No category or complexity change.");
  lines.push("");

  lines.push("TECH STACK");
  lines.push("-".repeat(40));
  if (diff.stackAdded.length) lines.push(`Added:    ${diff.stackAdded.join(", ")}`);
  if (diff.stackRemoved.length) lines.push(`Removed:  ${diff.stackRemoved.join(", ")}`);
  if (diff.stackUnchanged.length) lines.push(`Kept:     ${diff.stackUnchanged.join(", ")}`);
  lines.push("");

  if (diff.changedVitals.length) {
    lines.push("PROJECT VITALS CHANGES");
    lines.push("-".repeat(40));
    for (const v of diff.changedVitals) {
      lines.push(`${v.label}:`);
      lines.push(`  Before: ${v.before || "(empty)"}`);
      lines.push(`  After:  ${v.after || "(empty)"}`);
    }
    lines.push("");
  }

  if (diff.changedAnswers.length) {
    lines.push("Q&A CHANGES");
    lines.push("-".repeat(40));
    for (const a of diff.changedAnswers) {
      lines.push(`${a.label}`);
      lines.push(`  Before: ${a.before || "(no answer)"}`);
      lines.push(`  After:  ${a.after || "(no answer)"}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
