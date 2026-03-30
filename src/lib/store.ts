"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AnalysisResult,
  AnswerMap,
  AppStep,
  BlueprintDocument,
  MoodSelection,
  ProjectDetails,
  SavedBlueprint,
  DEFAULT_PROJECT_DETAILS,
} from "@/types";

// ── cache helpers ─────────────────────────────────────────────────────────────

export interface CacheEntry {
  result: AnalysisResult;
  cachedAt: string; // ISO
}

/** Stable cache key — normalised pitch string */
export function cacheKey(pitch: string): string {
  return pitch.trim().toLowerCase().replace(/\s+/g, " ");
}

const CACHE_MAX = 30;

// ── store interface ───────────────────────────────────────────────────────────

interface LucidraftStore {
  // ── session state ──────────────────────────────────────────
  step: AppStep;
  pitch: string;
  analysis: AnalysisResult | null;
  answers: AnswerMap;
  currentQuestionIndex: number;
  moodSelection: MoodSelection | null;
  suggestions: string;
  projectDetails: ProjectDetails;
  blueprintDoc: BlueprintDocument | null;

  // ── persisted state ────────────────────────────────────────
  savedBlueprints: SavedBlueprint[];
  analysisCache: Record<string, CacheEntry>;

  // ── session actions ────────────────────────────────────────
  setPitch: (pitch: string) => void;
  setStep: (step: AppStep) => void;
  setAnalysis: (result: AnalysisResult) => void;
  setBlueprintDoc: (doc: BlueprintDocument) => void;
  setAnswer: (id: string, value: string | string[]) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setMoodSelection: (mood: MoodSelection) => void;
  setSuggestions: (text: string) => void;
  setProjectDetail: (key: keyof ProjectDetails, value: string) => void;
  reset: () => void;

  // ── cache actions ──────────────────────────────────────────
  getCachedAnalysis: (pitch: string) => AnalysisResult | null;
  setCachedAnalysis: (pitch: string, result: AnalysisResult) => void;
  clearCacheEntry: (pitch: string) => void;

  // ── vitals sync ────────────────────────────────────────────
  syncVitalsFromAnswers: () => void;

  // ── history actions ────────────────────────────────────────
  saveBlueprint: () => void;
  loadBlueprint: (id: string) => void;
  deleteBlueprint: (id: string) => void;
}

const sessionDefaults = {
  step: "pitch" as AppStep,
  pitch: "",
  analysis: null,
  answers: {},
  currentQuestionIndex: 0,
  moodSelection: null,
  suggestions: "",
  projectDetails: { ...DEFAULT_PROJECT_DETAILS },
  blueprintDoc: null,
};

// ── store ─────────────────────────────────────────────────────────────────────

export const useLucidraftStore = create<LucidraftStore>()(
  persist(
    (set, get) => ({
      ...sessionDefaults,
      savedBlueprints: [],
      analysisCache: {},

      setPitch: (pitch) => set({ pitch }),
      setStep: (step) => set({ step }),
      setAnalysis: (analysis) => set({ analysis }),
      setBlueprintDoc: (blueprintDoc) => set({ blueprintDoc }),
      setAnswer: (id, value) =>
        set((s) => ({ answers: { ...s.answers, [id]: value } })),
      nextQuestion: () => {
        const { currentQuestionIndex, analysis } = get();
        const total = analysis?.dynamicQuestions.length ?? 0;
        if (currentQuestionIndex < total - 1)
          set({ currentQuestionIndex: currentQuestionIndex + 1 });
      },
      prevQuestion: () => {
        const { currentQuestionIndex } = get();
        if (currentQuestionIndex > 0)
          set({ currentQuestionIndex: currentQuestionIndex - 1 });
      },
      setMoodSelection: (moodSelection) => set({ moodSelection }),
      setSuggestions: (suggestions) => set({ suggestions }),
      setProjectDetail: (key, value) =>
        set((s) => ({ projectDetails: { ...s.projectDetails, [key]: value } })),
      reset: () => set(sessionDefaults),

      // vitals sync — auto-populate empty vital fields from Q&A answers
      syncVitalsFromAnswers: () => {
        const { analysis, answers, projectDetails } = get();
        if (!analysis) return;

        // Pattern → vital key mapping (only fills if the vital is currently empty)
        const PATTERNS: Array<{ re: RegExp; key: keyof ProjectDetails }> = [
          { re: /host|deploy/i,         key: "hosting" },
          { re: /auth/i,                key: "authMethod" },
          { re: /domain|url|site/i,     key: "domain" },
          { re: /repo|repositor/i,      key: "repository" },
          { re: /budget/i,              key: "budgetRange" },
          { re: /launch|timeline|deadline/i, key: "targetLaunch" },
          { re: /contact/i,             key: "primaryContact" },
        ];

        const updates: Partial<ProjectDetails> = {};

        for (const q of analysis.dynamicQuestions) {
          for (const { re, key } of PATTERNS) {
            if (re.test(q.id) || re.test(q.label)) {
              // Only overwrite if the vital is still blank
              if (!projectDetails[key]?.trim()) {
                const raw = answers[q.id];
                if (raw) {
                  updates[key] = Array.isArray(raw) ? raw.join(", ") : raw;
                }
              }
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          set((s) => ({ projectDetails: { ...s.projectDetails, ...updates } as ProjectDetails }));
        }
      },

      // cache
      getCachedAnalysis: (pitch) => {
        const entry = get().analysisCache[cacheKey(pitch)];
        return entry?.result ?? null;
      },

      setCachedAnalysis: (pitch, result) => {
        const key = cacheKey(pitch);
        const existing = get().analysisCache;
        const entries = Object.entries(existing);

        // Evict oldest when at capacity
        let next = { ...existing, [key]: { result, cachedAt: new Date().toISOString() } };
        if (entries.length >= CACHE_MAX && !existing[key]) {
          const oldest = entries.sort(
            (a, b) => new Date(a[1].cachedAt).getTime() - new Date(b[1].cachedAt).getTime()
          )[0][0];
          delete next[oldest];
        }

        set({ analysisCache: next });
      },

      clearCacheEntry: (pitch) => {
        const key = cacheKey(pitch);
        set((s) => {
          const next = { ...s.analysisCache };
          delete next[key];
          return { analysisCache: next };
        });
      },

      // history
      saveBlueprint: () => {
        const { pitch, analysis, answers, moodSelection, suggestions, projectDetails, blueprintDoc, savedBlueprints } = get();
        if (!analysis) return;
        const entry: SavedBlueprint = {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          pitch, analysis, answers, moodSelection, suggestions, projectDetails,
          blueprintDoc: blueprintDoc ?? undefined,
        };
        const filtered = savedBlueprints.filter((b) => b.pitch !== pitch);
        set({ savedBlueprints: [entry, ...filtered].slice(0, 20) });
      },

      loadBlueprint: (id) => {
        const blueprint = get().savedBlueprints.find((b) => b.id === id);
        if (!blueprint) return;
        set({
          pitch: blueprint.pitch,
          analysis: blueprint.analysis,
          answers: blueprint.answers,
          moodSelection: blueprint.moodSelection,
          suggestions: blueprint.suggestions,
          projectDetails: blueprint.projectDetails ?? { ...DEFAULT_PROJECT_DETAILS },
          blueprintDoc: blueprint.blueprintDoc ?? null,
          currentQuestionIndex: 0,
          step: "blueprint",
        });
      },

      deleteBlueprint: (id) =>
        set((s) => ({ savedBlueprints: s.savedBlueprints.filter((b) => b.id !== id) })),
    }),
    {
      name: "lucidraft-storage",
      partialize: (state) => ({
        savedBlueprints: state.savedBlueprints,
        analysisCache: state.analysisCache,
      }),
    }
  )
);
