"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLucidraftStore } from "@/lib/store";
import PitchInput from "@/components/PitchInput";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import DynamicQuestionStep from "@/components/DynamicQuestion";
import MoodBoard from "@/components/MoodBoard";
import Blueprint from "@/components/Blueprint";
import HistoryPanel from "@/components/HistoryPanel";

export default function Home() {
  const step = useLucidraftStore((s) => s.step);
  const savedBlueprints = useLucidraftStore((s) => s.savedBlueprints);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">

        {/* Top nav */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c6af7, #60a5fa)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Lucidraft
            </span>
          </motion.div>

          {/* Right side: step dots + history button */}
          <div className="flex items-center gap-3">
            {(step === "questions" || step === "moodboard" || step === "blueprint") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                {(["questions", "moodboard", "blueprint"] as const).map((s) => (
                  <div
                    key={s}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background:
                        s === step
                          ? "var(--accent)"
                          : step === "blueprint" || (step === "moodboard" && s === "questions")
                          ? "rgba(124,106,247,0.4)"
                          : "var(--border-glass)",
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* History button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setHistoryOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs glass glass-hover transition-all"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              History
              {savedBlueprints.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--accent)", color: "#fff", fontSize: "9px" }}
                >
                  {savedBlueprints.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Main content */}
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === "pitch" && (
              <motion.div key="pitch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PitchInput />
              </motion.div>
            )}
            {step === "analyzing" && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnalyzingScreen />
              </motion.div>
            )}
            {step === "questions" && (
              <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DynamicQuestionStep />
              </motion.div>
            )}
            {step === "moodboard" && (
              <motion.div key="moodboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MoodBoard />
              </motion.div>
            )}
            {step === "blueprint" && (
              <motion.div key="blueprint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Blueprint />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="absolute bottom-5 text-xs" style={{ color: "var(--text-muted)" }}>
          Lucidraft — AI-powered project scoping
        </p>
      </main>

      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
