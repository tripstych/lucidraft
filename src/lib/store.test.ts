import { beforeEach, describe, expect, it } from "vitest";
import { cacheKey, useLucidraftStore } from "./store";
import { DEFAULT_PROJECT_DETAILS } from "@/types";
import { makeAnalysis, makeBlueprint, makeBlueprintDoc } from "@/test/fixtures";
import type { AnalysisResult } from "@/types";

// ── test reset ────────────────────────────────────────────────────────────────

function resetStore() {
  localStorage.clear();
  useLucidraftStore.setState({
    step: "pitch",
    pitch: "",
    analysis: null,
    answers: {},
    currentQuestionIndex: 0,
    moodSelection: null,
    suggestions: "",
    projectDetails: { ...DEFAULT_PROJECT_DETAILS },
    blueprintDoc: null,
    savedBlueprints: [],
    analysisCache: {},
  });
}

// ── cacheKey() ────────────────────────────────────────────────────────────────

describe("cacheKey()", () => {
  it("lowercases the pitch", () => {
    expect(cacheKey("Hello World")).toBe("hello world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(cacheKey("  my pitch  ")).toBe("my pitch");
  });

  it("collapses multiple interior spaces to one", () => {
    expect(cacheKey("a  SaaS   dashboard")).toBe("a saas dashboard");
  });

  it("produces the same key for semantically identical pitches", () => {
    const a = cacheKey("  A SaaS Dashboard  ");
    const b = cacheKey("a saas dashboard");
    expect(a).toBe(b);
  });
});

// ── analysis cache ────────────────────────────────────────────────────────────

describe("analysis cache", () => {
  beforeEach(resetStore);

  const mockAnalysis: AnalysisResult = makeAnalysis();

  it("returns null on a cache miss", () => {
    const { getCachedAnalysis } = useLucidraftStore.getState();
    expect(getCachedAnalysis("unknown pitch")).toBeNull();
  });

  it("returns the stored result on a cache hit", () => {
    const { setCachedAnalysis, getCachedAnalysis } = useLucidraftStore.getState();
    setCachedAnalysis("my pitch", mockAnalysis);
    expect(getCachedAnalysis("my pitch")).toEqual(mockAnalysis);
  });

  it("normalises the pitch key (case + whitespace)", () => {
    const { setCachedAnalysis, getCachedAnalysis } = useLucidraftStore.getState();
    setCachedAnalysis("  My Pitch  ", mockAnalysis);
    expect(getCachedAnalysis("my pitch")).toEqual(mockAnalysis);
  });

  it("stores the cachedAt ISO timestamp alongside the result", () => {
    const { setCachedAnalysis } = useLucidraftStore.getState();
    setCachedAnalysis("test", mockAnalysis);
    const entry = useLucidraftStore.getState().analysisCache[cacheKey("test")];
    expect(entry.cachedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("evicts the oldest entry when capacity (30) is reached", () => {
    const { setCachedAnalysis } = useLucidraftStore.getState();

    // Fill cache to 30 entries
    for (let i = 0; i < 30; i++) {
      setCachedAnalysis(`pitch-${i}`, mockAnalysis);
    }
    // All 30 should be present
    expect(Object.keys(useLucidraftStore.getState().analysisCache)).toHaveLength(30);

    // Adding entry #31 must evict the oldest (pitch-0)
    setCachedAnalysis("pitch-new", mockAnalysis);
    const keys = Object.keys(useLucidraftStore.getState().analysisCache);
    expect(keys).toHaveLength(30);
    expect(keys).not.toContain(cacheKey("pitch-0"));
    expect(keys).toContain(cacheKey("pitch-new"));
  });

  it("updating an existing entry does not trigger eviction", () => {
    const { setCachedAnalysis } = useLucidraftStore.getState();

    // Fill cache to exactly 30
    for (let i = 0; i < 30; i++) {
      setCachedAnalysis(`pitch-${i}`, mockAnalysis);
    }
    // Re-save pitch-0 (already exists) — should NOT evict anything
    setCachedAnalysis("pitch-0", { ...mockAnalysis, summary: "updated" });
    expect(Object.keys(useLucidraftStore.getState().analysisCache)).toHaveLength(30);
  });

  it("clearCacheEntry removes the specified entry", () => {
    const { setCachedAnalysis, clearCacheEntry, getCachedAnalysis } = useLucidraftStore.getState();
    setCachedAnalysis("to-clear", mockAnalysis);
    clearCacheEntry("to-clear");
    expect(getCachedAnalysis("to-clear")).toBeNull();
  });

  it("clearCacheEntry is a no-op for a non-existent key", () => {
    const { clearCacheEntry } = useLucidraftStore.getState();
    expect(() => clearCacheEntry("does-not-exist")).not.toThrow();
  });
});

// ── question navigation ───────────────────────────────────────────────────────

describe("question navigation", () => {
  beforeEach(() => {
    resetStore();
    useLucidraftStore.setState({ analysis: makeAnalysis() }); // 3 questions
  });

  it("nextQuestion increments currentQuestionIndex", () => {
    useLucidraftStore.getState().nextQuestion();
    expect(useLucidraftStore.getState().currentQuestionIndex).toBe(1);
  });

  it("nextQuestion does not go past the last question", () => {
    useLucidraftStore.setState({ currentQuestionIndex: 2 }); // last of 3
    useLucidraftStore.getState().nextQuestion();
    expect(useLucidraftStore.getState().currentQuestionIndex).toBe(2);
  });

  it("prevQuestion decrements currentQuestionIndex", () => {
    useLucidraftStore.setState({ currentQuestionIndex: 2 });
    useLucidraftStore.getState().prevQuestion();
    expect(useLucidraftStore.getState().currentQuestionIndex).toBe(1);
  });

  it("prevQuestion does not go below 0", () => {
    useLucidraftStore.getState().prevQuestion();
    expect(useLucidraftStore.getState().currentQuestionIndex).toBe(0);
  });
});

// ── answer management ─────────────────────────────────────────────────────────

describe("answer management", () => {
  beforeEach(resetStore);

  it("setAnswer stores a string value", () => {
    useLucidraftStore.getState().setAnswer("q1", "My answer");
    expect(useLucidraftStore.getState().answers["q1"]).toBe("My answer");
  });

  it("setAnswer stores a string array for multiselect", () => {
    useLucidraftStore.getState().setAnswer("q1", ["Option A", "Option B"]);
    expect(useLucidraftStore.getState().answers["q1"]).toEqual(["Option A", "Option B"]);
  });

  it("setAnswer overwrites a previous answer for the same question", () => {
    useLucidraftStore.getState().setAnswer("q1", "first");
    useLucidraftStore.getState().setAnswer("q1", "second");
    expect(useLucidraftStore.getState().answers["q1"]).toBe("second");
  });

  it("setAnswer does not mutate other answers", () => {
    useLucidraftStore.getState().setAnswer("q1", "one");
    useLucidraftStore.getState().setAnswer("q2", "two");
    expect(useLucidraftStore.getState().answers["q1"]).toBe("one");
    expect(useLucidraftStore.getState().answers["q2"]).toBe("two");
  });
});

// ── syncVitalsFromAnswers ─────────────────────────────────────────────────────

describe("syncVitalsFromAnswers()", () => {
  beforeEach(resetStore);

  function setupWithQuestion(id: string, label: string, answer: string | string[]) {
    const analysis = makeAnalysis({
      dynamicQuestions: [{ id, label, type: "text", required: true }],
    });
    useLucidraftStore.setState({ analysis, answers: { [id]: answer } });
  }

  it("auto-populates hosting from a question ID matching /host/", () => {
    setupWithQuestion("hosting_provider", "Hosting question", "DigitalOcean");
    useLucidraftStore.getState().syncVitalsFromAnswers();
    expect(useLucidraftStore.getState().projectDetails.hosting).toBe("DigitalOcean");
  });

  it("auto-populates hosting from a question label matching /deploy/", () => {
    setupWithQuestion("q_platform", "Where will you deploy this?", "AWS");
    useLucidraftStore.getState().syncVitalsFromAnswers();
    expect(useLucidraftStore.getState().projectDetails.hosting).toBe("AWS");
  });

  it("auto-populates authMethod from a question ID matching /auth/", () => {
    setupWithQuestion("auth_type", "Auth question", "SSO");
    useLucidraftStore.getState().syncVitalsFromAnswers();
    expect(useLucidraftStore.getState().projectDetails.authMethod).toBe("SSO");
  });

  it("auto-populates domain from a question ID matching /domain/", () => {
    setupWithQuestion("domain_name", "Domain label", "acme.com");
    useLucidraftStore.getState().syncVitalsFromAnswers();
    expect(useLucidraftStore.getState().projectDetails.domain).toBe("acme.com");
  });

  it("auto-populates targetLaunch from a question label matching /timeline/", () => {
    setupWithQuestion("q_time", "What is your timeline?", "Q4 2025");
    useLucidraftStore.getState().syncVitalsFromAnswers();
    expect(useLucidraftStore.getState().projectDetails.targetLaunch).toBe("Q4 2025");
  });

  it("does NOT overwrite a vital that already has a value", () => {
    setupWithQuestion("hosting_provider", "Hosting question", "GCP");
    useLucidraftStore.setState({
      projectDetails: { ...DEFAULT_PROJECT_DETAILS, hosting: "Vercel" },
    });
    useLucidraftStore.getState().syncVitalsFromAnswers();
    expect(useLucidraftStore.getState().projectDetails.hosting).toBe("Vercel");
  });

  it("joins array answers with ', ' when populating a vital", () => {
    setupWithQuestion("auth_method", "Auth question", ["Email & password", "Google OAuth"]);
    useLucidraftStore.getState().syncVitalsFromAnswers();
    expect(useLucidraftStore.getState().projectDetails.authMethod).toBe(
      "Email & password, Google OAuth"
    );
  });

  it("is a no-op when analysis is null", () => {
    useLucidraftStore.setState({ analysis: null });
    expect(() => useLucidraftStore.getState().syncVitalsFromAnswers()).not.toThrow();
    expect(useLucidraftStore.getState().projectDetails).toEqual(DEFAULT_PROJECT_DETAILS);
  });
});

// ── blueprint history ─────────────────────────────────────────────────────────

describe("blueprint history", () => {
  beforeEach(resetStore);

  it("saveBlueprint does nothing when analysis is null", () => {
    useLucidraftStore.getState().saveBlueprint();
    expect(useLucidraftStore.getState().savedBlueprints).toHaveLength(0);
  });

  it("saveBlueprint creates an entry with a unique ID and timestamp", () => {
    useLucidraftStore.setState({ pitch: "my pitch", analysis: makeAnalysis() });
    useLucidraftStore.getState().saveBlueprint();
    const [entry] = useLucidraftStore.getState().savedBlueprints;
    expect(entry.id).toBeTruthy();
    expect(entry.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.pitch).toBe("my pitch");
  });

  it("saveBlueprint includes blueprintDoc when present", () => {
    const doc = makeBlueprintDoc();
    useLucidraftStore.setState({ pitch: "pitch", analysis: makeAnalysis(), blueprintDoc: doc });
    useLucidraftStore.getState().saveBlueprint();
    expect(useLucidraftStore.getState().savedBlueprints[0].blueprintDoc).toEqual(doc);
  });

  it("saveBlueprint deduplicates by pitch (keeps newest)", () => {
    useLucidraftStore.setState({ pitch: "same pitch", analysis: makeAnalysis() });
    useLucidraftStore.getState().saveBlueprint();
    useLucidraftStore.getState().saveBlueprint();
    expect(useLucidraftStore.getState().savedBlueprints).toHaveLength(1);
  });

  it("saveBlueprint caps history at 20 entries", () => {
    for (let i = 0; i < 25; i++) {
      useLucidraftStore.setState({ pitch: `pitch-${i}`, analysis: makeAnalysis() });
      useLucidraftStore.getState().saveBlueprint();
    }
    expect(useLucidraftStore.getState().savedBlueprints).toHaveLength(20);
  });

  it("loadBlueprint restores all session state", () => {
    const saved = makeBlueprint({ id: "bp-1", pitch: "restored pitch" });
    useLucidraftStore.setState({ savedBlueprints: [saved] });
    useLucidraftStore.getState().loadBlueprint("bp-1");
    const state = useLucidraftStore.getState();
    expect(state.pitch).toBe("restored pitch");
    expect(state.analysis).toEqual(saved.analysis);
    expect(state.answers).toEqual(saved.answers);
    expect(state.step).toBe("blueprint");
    expect(state.currentQuestionIndex).toBe(0);
  });

  it("loadBlueprint restores blueprintDoc when present", () => {
    const doc = makeBlueprintDoc();
    const saved = makeBlueprint({ id: "bp-2", blueprintDoc: doc });
    useLucidraftStore.setState({ savedBlueprints: [saved] });
    useLucidraftStore.getState().loadBlueprint("bp-2");
    expect(useLucidraftStore.getState().blueprintDoc).toEqual(doc);
  });

  it("loadBlueprint sets blueprintDoc to null when absent", () => {
    const saved = makeBlueprint({ id: "bp-3" });
    delete saved.blueprintDoc;
    useLucidraftStore.setState({ savedBlueprints: [saved], blueprintDoc: makeBlueprintDoc() });
    useLucidraftStore.getState().loadBlueprint("bp-3");
    expect(useLucidraftStore.getState().blueprintDoc).toBeNull();
  });

  it("loadBlueprint is a no-op for an unknown ID", () => {
    const before = useLucidraftStore.getState().pitch;
    useLucidraftStore.getState().loadBlueprint("nonexistent");
    expect(useLucidraftStore.getState().pitch).toBe(before);
  });

  it("deleteBlueprint removes the correct entry", () => {
    const bp1 = makeBlueprint({ id: "keep" });
    const bp2 = makeBlueprint({ id: "remove" });
    useLucidraftStore.setState({ savedBlueprints: [bp1, bp2] });
    useLucidraftStore.getState().deleteBlueprint("remove");
    const remaining = useLucidraftStore.getState().savedBlueprints;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("keep");
  });

  it("deleteBlueprint is a no-op for an unknown ID", () => {
    const bp = makeBlueprint({ id: "only" });
    useLucidraftStore.setState({ savedBlueprints: [bp] });
    useLucidraftStore.getState().deleteBlueprint("ghost");
    expect(useLucidraftStore.getState().savedBlueprints).toHaveLength(1);
  });
});

// ── reset() ───────────────────────────────────────────────────────────────────

describe("reset()", () => {
  beforeEach(resetStore);

  it("clears all session state back to defaults", () => {
    useLucidraftStore.setState({
      step: "blueprint",
      pitch: "some pitch",
      analysis: makeAnalysis(),
      answers: { q1: "answer" },
      currentQuestionIndex: 3,
      moodSelection: { palette: ["#fff"], mood: "Bold", style: "Flat" },
      suggestions: "some suggestions",
      blueprintDoc: makeBlueprintDoc(),
    });
    useLucidraftStore.getState().reset();
    const s = useLucidraftStore.getState();
    expect(s.step).toBe("pitch");
    expect(s.pitch).toBe("");
    expect(s.analysis).toBeNull();
    expect(s.answers).toEqual({});
    expect(s.currentQuestionIndex).toBe(0);
    expect(s.moodSelection).toBeNull();
    expect(s.suggestions).toBe("");
    expect(s.blueprintDoc).toBeNull();
  });

  it("preserves savedBlueprints after reset", () => {
    const bp = makeBlueprint({ id: "persist-me" });
    useLucidraftStore.setState({ savedBlueprints: [bp] });
    useLucidraftStore.getState().reset();
    expect(useLucidraftStore.getState().savedBlueprints).toHaveLength(1);
    expect(useLucidraftStore.getState().savedBlueprints[0].id).toBe("persist-me");
  });

  it("preserves analysisCache after reset", () => {
    const { setCachedAnalysis } = useLucidraftStore.getState();
    setCachedAnalysis("cached pitch", makeAnalysis());
    useLucidraftStore.getState().reset();
    expect(useLucidraftStore.getState().getCachedAnalysis("cached pitch")).not.toBeNull();
  });
});
