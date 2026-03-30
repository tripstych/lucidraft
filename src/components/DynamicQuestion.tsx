"use client";

import { useState } from "react";
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
  const selected: string[] = Array.isArray(value) ? value : value ? [value] : [];

  function toggle(opt: string) {
    if (multi) {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      onChange(next);
    } else {
      onChange(opt);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {(question.options ?? []).map((opt) => {
        const active = selected.includes(opt);
        return (
          <motion.button
            key={opt}
            onClick={() => toggle(opt)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="text-left px-4 py-3 rounded-xl text-sm transition-all duration-150"
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
