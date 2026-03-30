"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DynamicQuestion, AnalysisResult } from "@/types";
import { useLucidraftStore } from "@/lib/store";

function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="w-full h-0.5 rounded-full mb-8" style={{ background: "var(--border-glass)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: "linear-gradient(90deg, #7c6af7, #60a5fa)" }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

function TextAnswer({
  question,
  value,
  onChange,
}: {
  question: DynamicQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return question.type === "textarea" ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder ?? "Your answer..."}
      rows={4}
      className="w-full bg-transparent glass rounded-xl px-4 py-3 text-sm outline-none resize-none leading-relaxed focus:border-purple-500/50 transition-colors"
      style={{ color: "var(--text-primary)", borderColor: "var(--border-glass)" }}
    />
  ) : (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder ?? "Your answer..."}
      className="w-full bg-transparent glass rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 transition-colors"
      style={{ color: "var(--text-primary)", borderColor: "var(--border-glass)" }}
    />
  );
}

function SelectAnswer({
  question,
  value,
  onChange,
  multi,
}: {
  question: DynamicQuestion;
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi: boolean;
}) {
  const [customInput, setCustomInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected: string[] = Array.isArray(value) ? value : value ? [value] : [];
  const presetOptions = question.options ?? [];
  // Custom values are selections not in the preset list
  const customValues = selected.filter((s) => !presetOptions.includes(s));

  function toggle(opt: string) {
    if (multi) {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      onChange(next);
    } else {
      onChange(selected.includes(opt) ? [] : opt);
    }
  }

  function addCustom() {
    const val = customInput.trim();
    if (!val) return;
    if (multi) {
      if (!selected.includes(val)) onChange([...selected, val]);
    } else {
      onChange(val);
    }
    setCustomInput("");
  }

  return (
    <div className="space-y-2">
      {presetOptions.map((opt) => {
        const active = selected.includes(opt);
        return (
          <motion.button
            key={opt}
            onClick={() => toggle(opt)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-150"
            style={{
              background: active ? "rgba(124,106,247,0.18)" : "var(--bg-glass)",
              border: `1px solid ${active ? "rgba(124,106,247,0.5)" : "var(--border-glass)"}`,
              color: active ? "#a78bfa" : "var(--text-primary)",
            }}
          >
            <span className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center"
                style={{
                  background: active ? "#7c6af7" : "var(--bg-glass)",
                  border: `1px solid ${active ? "#7c6af7" : "var(--border-glass)"}`,
                }}
              >
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              {opt}
            </span>
          </motion.button>
        );
      })}

      {/* Custom value chips (multiselect) */}
      {multi && customValues.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {customValues.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
              style={{ background: "rgba(124,106,247,0.18)", border: "1px solid rgba(124,106,247,0.5)", color: "#a78bfa" }}
            >
              {v}
              <button
                onClick={() => onChange(selected.filter((s) => s !== v))}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Type your own */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
        style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Type your own answer..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--text-primary)" }}
        />
        {customInput.trim() && (
          <button
            onClick={addCustom}
            className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ background: "rgba(124,106,247,0.25)", color: "#a78bfa", border: "none" }}
          >
            {multi ? "Add" : "Use this"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DynamicQuestionStep() {
  const {
    analysis,
    currentQuestionIndex,
    answers,
    setAnswer,
    nextQuestion,
    prevQuestion,
    setStep,
    syncVitalsFromAnswers,
  } = useLucidraftStore();

  const [localValue, setLocalValue] = useState<string | string[]>("");

  if (!analysis) return null;

  const questions = analysis.dynamicQuestions;
  const question = questions[currentQuestionIndex];
  const isLast = currentQuestionIndex === questions.length - 1;
  const savedValue = answers[question.id] ?? "";
  const displayValue = savedValue || localValue;

  function handleNext() {
    setAnswer(question.id, displayValue);
    setLocalValue("");
    if (isLast) {
      syncVitalsFromAnswers();
      if (analysis!.visualRequirements) {
        setStep("moodboard");
      } else {
        setStep("blueprint");
      }
    } else {
      nextQuestion();
    }
  }

  function handleBack() {
    setAnswer(question.id, displayValue);
    setLocalValue("");
    if (currentQuestionIndex === 0) {
      setStep("pitch");
    } else {
      prevQuestion();
    }
  }

  const canAdvance =
    !question.required ||
    (Array.isArray(displayValue)
      ? displayValue.length > 0
      : String(displayValue).trim().length > 0);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto"
    >
      <ProgressBar current={currentQuestionIndex} total={questions.length} />

      {/* Category badge */}
      <div className="flex items-center gap-2 mb-6">
        <span
          className="text-xs px-2 py-0.5 rounded-full glass"
          style={{ color: "var(--accent)" }}
        >
          {analysis.primaryCategory}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </span>
      </div>

      <h2
        className="text-2xl font-semibold mb-6 leading-snug"
        style={{ color: "var(--text-primary)" }}
      >
        {question.label}
      </h2>

      <div className="mb-8">
        <AnimatePresence mode="wait">
          {question.type === "text" || question.type === "textarea" ? (
            <motion.div
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TextAnswer
                question={question}
                value={String(displayValue)}
                onChange={setLocalValue}
              />
            </motion.div>
          ) : (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SelectAnswer
                question={question}
                value={displayValue}
                onChange={setLocalValue}
                multi={question.type === "multiselect"}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all glass glass-hover"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <motion.button
          onClick={handleNext}
          disabled={!canAdvance}
          whileHover={canAdvance ? { scale: 1.03 } : {}}
          whileTap={canAdvance ? { scale: 0.97 } : {}}
          className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: canAdvance
              ? "linear-gradient(135deg, #7c6af7, #60a5fa)"
              : "var(--bg-glass)",
            color: canAdvance ? "#fff" : "var(--text-muted)",
            cursor: canAdvance ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          {isLast ? (analysis!.visualRequirements ? "Choose style" : "Build blueprint") : "Continue"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
}
