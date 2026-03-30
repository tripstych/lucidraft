"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AnalysisResult,
  AnswerMap,
  AppStep,
  MoodSelection,
  SavedBlueprint,
} from "@/types";

interface LucidraftStore {
  // ── session state ──────────────────────────────────────────
  step: AppStep;
  pitch: string;
  analysis: AnalysisResult | null;
  answers: AnswerMap;
  currentQuestionIndex: number;
  moodSelection: MoodSelection | null;
  suggestions: string;

  // ── persisted state ────────────────────────────────────────
  savedBlueprints: SavedBlueprint[];

  // ── session actions ────────────────────────────────────────
  setPitch: (pitch: string) => void;
  setStep: (step: AppStep) => void;
  setAnalysis: (result: AnalysisResult) => void;
  setAnswer: (id: string, value: string | string[]) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setMoodSelection: (mood: MoodSelection) => void;
  setSuggestions: (text: string) => void;
  reset: () => void;

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
};

export const useLucidraftStore = create<LucidraftStore>()(
  persist(
    (set, get) => ({
      ...sessionDefaults,
      savedBlueprints: [],

      setPitch: (pitch) => set({ pitch }),
      setStep: (step) => set({ step }),
      setAnalysis: (analysis) => set({ analysis }),
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
      reset: () => set(sessionDefaults),

      saveBlueprint: () => {
        const { pitch, analysis, answers, moodSelection, suggestions, savedBlueprints } =
          get();
        if (!analysis) return;

        const entry: SavedBlueprint = {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          pitch,
          analysis,
          answers,
          moodSelection,
          suggestions,
        };

        // Replace if same pitch already saved, otherwise prepend; cap at 20
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
          currentQuestionIndex: 0,
          step: "blueprint",
        });
      },

      deleteBlueprint: (id) =>
        set((s) => ({
          savedBlueprints: s.savedBlueprints.filter((b) => b.id !== id),
        })),
    }),
    {
      name: "lucidraft-storage",
      // Only persist history — session state resets each visit
      partialize: (state) => ({ savedBlueprints: state.savedBlueprints }),
    }
  )
);
