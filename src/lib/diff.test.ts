import { describe, it, expect } from "vitest";
import { diffBlueprints, diffToPlainText } from "./diff";
import { makeAnalysis, makeBlueprint, makeProjectDetails } from "@/test/fixtures";

// ── helpers ───────────────────────────────────────────────────────────────────

function blueprintsAt(offsetMs: number) {
  const base = new Date("2025-01-01T00:00:00Z").getTime();
  return {
    older: makeBlueprint({ savedAt: new Date(base).toISOString() }),
    newer: makeBlueprint({ savedAt: new Date(base + offsetMs).toISOString() }),
  };
}

// ── diffBlueprints — overview ─────────────────────────────────────────────────

describe("diffBlueprints() — overview", () => {
  it("returns all-false/empty for identical blueprints", () => {
    const bp = makeBlueprint();
    const diff = diffBlueprints(bp, bp);
    expect(diff.categoryChanged).toBe(false);
    expect(diff.complexityChanged).toBe(false);
    expect(diff.stackAdded).toHaveLength(0);
    expect(diff.stackRemoved).toHaveLength(0);
    expect(diff.stackUnchanged).toEqual(bp.analysis.suggestedTechStack);
    expect(diff.changedVitals).toHaveLength(0);
    expect(diff.changedAnswers).toHaveLength(0);
  });

  it("detects primaryCategory change", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ primaryCategory: "Web" }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ primaryCategory: "Mobile" }) });
    expect(diffBlueprints(a, b).categoryChanged).toBe(true);
  });

  it("does NOT flag categoryChanged when category is the same", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ primaryCategory: "Web" }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ primaryCategory: "Web" }) });
    expect(diffBlueprints(a, b).categoryChanged).toBe(false);
  });

  it("detects complexity upgrade: Simple → Complex", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ complexity: "Simple" }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ complexity: "Complex" }) });
    expect(diffBlueprints(a, b).complexityChanged).toBe(true);
  });

  it("does NOT flag complexityChanged for same level", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ complexity: "Medium" }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ complexity: "Medium" }) });
    expect(diffBlueprints(a, b).complexityChanged).toBe(false);
  });
});

// ── diffBlueprints — tech stack ───────────────────────────────────────────────

describe("diffBlueprints() — tech stack", () => {
  it("identifies newly added technologies", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React", "Node.js"] }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React", "Node.js", "Redis"] }) });
    const diff = diffBlueprints(a, b);
    expect(diff.stackAdded).toEqual(["Redis"]);
    expect(diff.stackRemoved).toHaveLength(0);
  });

  it("identifies removed technologies", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React", "Node.js", "MongoDB"] }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React", "Node.js"] }) });
    const diff = diffBlueprints(a, b);
    expect(diff.stackRemoved).toEqual(["MongoDB"]);
    expect(diff.stackAdded).toHaveLength(0);
  });

  it("classifies unchanged technologies correctly", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React", "Node.js", "Postgres"] }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React", "Node.js", "MySQL"] }) });
    const diff = diffBlueprints(a, b);
    expect(diff.stackUnchanged).toEqual(["React", "Node.js"]);
    expect(diff.stackAdded).toEqual(["MySQL"]);
    expect(diff.stackRemoved).toEqual(["Postgres"]);
  });

  it("handles complete stack replacement", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["Django", "Postgres"] }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["Rails", "MySQL"] }) });
    const diff = diffBlueprints(a, b);
    expect(diff.stackUnchanged).toHaveLength(0);
    expect(diff.stackAdded).toEqual(["Rails", "MySQL"]);
    expect(diff.stackRemoved).toEqual(["Django", "Postgres"]);
  });

  it("handles empty baseline stack", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: [] }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React"] }) });
    const diff = diffBlueprints(a, b);
    expect(diff.stackAdded).toEqual(["React"]);
    expect(diff.stackRemoved).toHaveLength(0);
    expect(diff.stackUnchanged).toHaveLength(0);
  });
});

// ── diffBlueprints — project vitals ──────────────────────────────────────────

describe("diffBlueprints() — project vitals", () => {
  it("detects a changed vital field", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ hosting: "Vercel" }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ hosting: "AWS" }) });
    const diff = diffBlueprints(a, b);
    const hosVital = diff.changedVitals.find((v) => v.key === "hosting");
    expect(hosVital).toBeDefined();
    expect(hosVital?.before).toBe("Vercel");
    expect(hosVital?.after).toBe("AWS");
  });

  it("includes human-readable label for changed vital", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ hosting: "Vercel" }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ hosting: "AWS" }) });
    const diff = diffBlueprints(a, b);
    const hosVital = diff.changedVitals.find((v) => v.key === "hosting");
    expect(hosVital?.label).toBe("Hosting");
  });

  it("detects empty → filled vital", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ domain: "" }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ domain: "app.acme.com" }) });
    const diff = diffBlueprints(a, b);
    expect(diff.changedVitals.find((v) => v.key === "domain")).toBeDefined();
  });

  it("detects filled → empty vital", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ budgetRange: "£10k" }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ budgetRange: "" }) });
    const diff = diffBlueprints(a, b);
    expect(diff.changedVitals.find((v) => v.key === "budgetRange")).toBeDefined();
  });

  it("ignores vitals where both are empty", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ repository: "" }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ repository: "" }) });
    const diff = diffBlueprints(a, b);
    expect(diff.changedVitals.find((v) => v.key === "repository")).toBeUndefined();
  });

  it("ignores vitals that are unchanged", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ authMethod: "Email" }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ authMethod: "Email" }) });
    const diff = diffBlueprints(a, b);
    expect(diff.changedVitals.find((v) => v.key === "authMethod")).toBeUndefined();
  });

  it("trims whitespace when comparing vitals", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ hosting: "  Vercel  " }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ hosting: "Vercel" }) });
    // after trim both are "Vercel" — no change
    expect(diffBlueprints(a, b).changedVitals.find((v) => v.key === "hosting")).toBeUndefined();
  });
});

// ── diffBlueprints — Q&A answers ─────────────────────────────────────────────

describe("diffBlueprints() — Q&A answers", () => {
  it("detects a changed string answer", () => {
    const a = makeBlueprint({ answers: { primary_audience: "Consumers (B2C)" } });
    const b = makeBlueprint({ answers: { primary_audience: "Businesses (B2B)" } });
    const diff = diffBlueprints(a, b);
    const changed = diff.changedAnswers.find((x) => x.id === "primary_audience");
    expect(changed?.before).toBe("Consumers (B2C)");
    expect(changed?.after).toBe("Businesses (B2B)");
  });

  it("normalises array answers to comma-joined string for comparison", () => {
    const a = makeBlueprint({ answers: { auth_method: ["Email & password"] } });
    const b = makeBlueprint({ answers: { auth_method: ["Email & password", "Google / social login"] } });
    const diff = diffBlueprints(a, b);
    const changed = diff.changedAnswers.find((x) => x.id === "auth_method");
    expect(changed?.before).toBe("Email & password");
    expect(changed?.after).toBe("Email & password, Google / social login");
  });

  it("detects answer only in baseline (removed question)", () => {
    const a = makeBlueprint({ answers: { old_question: "some answer" } });
    const b = makeBlueprint({ answers: {} });
    const diff = diffBlueprints(a, b);
    const changed = diff.changedAnswers.find((x) => x.id === "old_question");
    expect(changed?.before).toBe("some answer");
    expect(changed?.after).toBe("");
  });

  it("detects answer only in current (new question)", () => {
    const a = makeBlueprint({ answers: {} });
    const b = makeBlueprint({ answers: { new_question: "new answer" } });
    const diff = diffBlueprints(a, b);
    const changed = diff.changedAnswers.find((x) => x.id === "new_question");
    expect(changed?.before).toBe("");
    expect(changed?.after).toBe("new answer");
  });

  it("ignores unchanged answers", () => {
    const a = makeBlueprint({ answers: { primary_audience: "Businesses (B2B)" } });
    const b = makeBlueprint({ answers: { primary_audience: "Businesses (B2B)" } });
    const diff = diffBlueprints(a, b);
    expect(diff.changedAnswers.find((x) => x.id === "primary_audience")).toBeUndefined();
  });

  it("uses question label from analysis.dynamicQuestions for known IDs", () => {
    const analysis = makeAnalysis();
    const a = makeBlueprint({ analysis, answers: { primary_audience: "B2C" } });
    const b = makeBlueprint({ analysis, answers: { primary_audience: "B2B" } });
    const diff = diffBlueprints(a, b);
    const changed = diff.changedAnswers.find((x) => x.id === "primary_audience");
    expect(changed?.label).toBe("Who is the primary user?");
  });
});

// ── diffToPlainText ───────────────────────────────────────────────────────────

describe("diffToPlainText()", () => {
  it("includes SCOPE CHANGE REPORT header", () => {
    const bp = makeBlueprint();
    const diff = diffBlueprints(bp, bp);
    expect(diffToPlainText(bp, bp, diff)).toContain("SCOPE CHANGE REPORT");
  });

  it("includes baseline and current date lines", () => {
    const a = makeBlueprint({ savedAt: "2025-01-01T00:00:00Z" });
    const b = makeBlueprint({ savedAt: "2025-06-01T00:00:00Z" });
    const diff = diffBlueprints(a, b);
    const text = diffToPlainText(a, b, diff);
    expect(text).toContain("Baseline:");
    expect(text).toContain("Current:");
  });

  it("includes pitch snippet in baseline and current lines", () => {
    const a = makeBlueprint({ pitch: "A web app for tracking hydration habits" });
    const b = makeBlueprint({ pitch: "A mobile app for tracking hydration habits" });
    const diff = diffBlueprints(a, b);
    const text = diffToPlainText(a, b, diff);
    expect(text).toContain("web app");
    expect(text).toContain("mobile app");
  });

  it("reports category change in OVERVIEW section", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ primaryCategory: "Web" }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ primaryCategory: "Mobile" }) });
    const diff = diffBlueprints(a, b);
    const text = diffToPlainText(a, b, diff);
    expect(text).toContain("Category:");
    expect(text).toContain("Web");
    expect(text).toContain("Mobile");
  });

  it("reports added stack items with Added: prefix", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React"] }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React", "Redis"] }) });
    const diff = diffBlueprints(a, b);
    expect(diffToPlainText(a, b, diff)).toContain("Added:    Redis");
  });

  it("reports removed stack items with Removed: prefix", () => {
    const a = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React", "Vue"] }) });
    const b = makeBlueprint({ analysis: makeAnalysis({ suggestedTechStack: ["React"] }) });
    const diff = diffBlueprints(a, b);
    expect(diffToPlainText(a, b, diff)).toContain("Removed:  Vue");
  });

  it("includes PROJECT VITALS CHANGES section when vitals differ", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ hosting: "Vercel" }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ hosting: "AWS" }) });
    const diff = diffBlueprints(a, b);
    const text = diffToPlainText(a, b, diff);
    expect(text).toContain("PROJECT VITALS CHANGES");
    expect(text).toContain("Hosting:");
    expect(text).toContain("Before: Vercel");
    expect(text).toContain("After:  AWS");
  });

  it("includes Q&A CHANGES section when answers differ", () => {
    const a = makeBlueprint({ answers: { primary_audience: "B2C" } });
    const b = makeBlueprint({ answers: { primary_audience: "B2B" } });
    const diff = diffBlueprints(a, b);
    const text = diffToPlainText(a, b, diff);
    expect(text).toContain("Q&A CHANGES");
    expect(text).toContain("Before: B2C");
    expect(text).toContain("After:  B2B");
  });

  it("shows (empty) for blank vitals in the report", () => {
    const a = makeBlueprint({ projectDetails: makeProjectDetails({ domain: "" }) });
    const b = makeBlueprint({ projectDetails: makeProjectDetails({ domain: "acme.com" }) });
    const diff = diffBlueprints(a, b);
    expect(diffToPlainText(a, b, diff)).toContain("(empty)");
  });

  it("omits vitals section when no vitals changed", () => {
    const bp = makeBlueprint();
    const diff = diffBlueprints(bp, bp);
    expect(diffToPlainText(bp, bp, diff)).not.toContain("PROJECT VITALS CHANGES");
  });

  it("omits Q&A section when no answers changed", () => {
    const bp = makeBlueprint();
    const diff = diffBlueprints(bp, bp);
    expect(diffToPlainText(bp, bp, diff)).not.toContain("Q&A CHANGES");
  });
});
