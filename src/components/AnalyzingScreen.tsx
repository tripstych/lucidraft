"use client";

import { motion } from "framer-motion";
import { useLucidraftStore } from "@/lib/store";

const STEPS = [
  "Reading your pitch...",
  "Detecting project category...",
  "Identifying complexity...",
  "Generating your discovery questions...",
];

export default function AnalyzingScreen() {
  const pitch = useLucidraftStore((s) => s.pitch);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto text-center"
    >
      {/* Pulsing orb */}
      <div className="relative mx-auto mb-10 w-20 h-20">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full"
          style={{ background: "var(--accent-glow)" }}
        />
        <div
          className="relative z-10 w-20 h-20 rounded-full glass flex items-center justify-center"
          style={{ border: "1px solid var(--accent)" }}
        >
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: "var(--accent)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
          </motion.svg>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
        Analyzing your pitch
      </h2>

      {/* Truncated pitch preview */}
      <p
        className="text-sm mb-8 mx-auto max-w-sm italic px-4 leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        &ldquo;{pitch.length > 100 ? pitch.slice(0, 100) + "…" : pitch}&rdquo;
      </p>

      {/* Animated step list */}
      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.55, duration: 0.4 }}
            className="flex items-center gap-3 glass rounded-xl px-4 py-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.55 + 0.2, type: "spring" }}
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ background: "var(--accent)", opacity: 0.9 }}
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {step}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
