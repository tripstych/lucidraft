"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLucidraftStore } from "@/lib/store";
import { AnalysisResult } from "@/types";

const PLACEHOLDERS = [
  "I want to build a SaaS dashboard for marketing teams...",
  "An iOS app that helps people track their hydration...",
  "A desktop tool for video editors to manage assets...",
  "An e-commerce store selling handmade ceramics...",
];

export default function PitchInput() {
  const [text, setText] = useState("");
  const [placeholder] = useState(
    PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
  );
  const [error, setError] = useState("");
  const [cacheHit, setCacheHit] = useState(false);

  const { setStep, setPitch, setAnalysis, getCachedAnalysis, setCachedAnalysis, clearCacheEntry } =
    useLucidraftStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = text.length;
  const isReady = charCount >= 20;
  const hasCached = isReady && !!getCachedAnalysis(text);

  async function handleSubmit({ bust = false } = {}) {
    if (!isReady) return;
    setError("");

    // Cache hit — skip API entirely
    if (!bust) {
      const cached = getCachedAnalysis(text);
      if (cached) {
        setPitch(text);
        setAnalysis(cached);
        setCacheHit(true);
        setTimeout(() => {
          setCacheHit(false);
          setStep("questions");
        }, 700); // brief flash so the user sees the "cached" state
        return;
      }
    } else {
      clearCacheEntry(text);
    }

    setPitch(text);
    setStep("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch: text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Analysis failed");
      }

      const result: AnalysisResult = await res.json();
      setCachedAnalysis(text, result);
      setAnalysis(result);
      setStep("questions");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setStep("pitch");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-6 text-xs tracking-widest uppercase"
          style={{ color: "var(--accent)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          AI Scoping Engine
        </motion.div>

        <h1
          className="text-4xl font-semibold tracking-tight mb-3 gradient-text"
          style={{ lineHeight: 1.2 }}
        >
          What are you building?
        </h1>
        <p style={{ color: "var(--text-muted)" }} className="text-base">
          Describe your project idea. Lucidraft will craft a tailored discovery journey.
        </p>
      </div>

      {/* Input card */}
      <div
        className="glass rounded-2xl p-1 glow-accent relative"
        style={cacheHit ? { borderColor: "rgba(74,222,128,0.4)" } : undefined}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setCacheHit(false); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={5}
          className="w-full bg-transparent resize-none outline-none px-5 pt-5 pb-3 text-base leading-relaxed"
          style={{ color: "var(--text-primary)" }}
        />

        <div className="flex items-center justify-between px-5 pb-4 gap-3">
          {/* Left: hint / cache badge */}
          <div className="flex items-center gap-2 min-w-0">
            <AnimatePresence mode="wait">
              {cacheHit ? (
                <motion.span
                  key="cached"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "#4ade80" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                  </svg>
                  Loaded from cache
                </motion.span>
              ) : hasCached ? (
                <motion.span
                  key="has-cache"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                  </svg>
                  Cached result available ·{" "}
                  <button
                    onClick={() => handleSubmit({ bust: true })}
                    className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                  >
                    re-analyse
                  </button>
                </motion.span>
              ) : (
                <motion.span
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs"
                  style={{ color: charCount < 20 ? "var(--text-muted)" : "var(--accent)" }}
                >
                  {charCount < 20
                    ? `${20 - charCount} more characters to continue`
                    : "⌘ + Enter to analyze"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Right: submit */}
          <motion.button
            onClick={() => handleSubmit()}
            disabled={!isReady}
            whileHover={isReady ? { scale: 1.03 } : {}}
            whileTap={isReady ? { scale: 0.97 } : {}}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex-shrink-0"
            style={{
              background: isReady
                ? hasCached
                  ? "linear-gradient(135deg, #059669, #10b981)"
                  : "linear-gradient(135deg, #7c6af7, #60a5fa)"
                : "var(--bg-glass)",
              color: isReady ? "#fff" : "var(--text-muted)",
              cursor: isReady ? "pointer" : "not-allowed",
              border: "none",
            }}
          >
            {hasCached ? "Use cached" : "Analyze pitch"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-sm text-center"
            style={{ color: "#f87171" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
