"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLucidraftStore } from "@/lib/store";

const MOODS = [
  {
    id: "bold",
    label: "Bold & Energetic",
    palette: ["#ff3b5c", "#ff8c00", "#ffd700"],
    bg: "linear-gradient(135deg, #ff3b5c22, #ff8c0022)",
    desc: "High contrast, vivid colors, strong typography",
  },
  {
    id: "calm",
    label: "Calm & Trustworthy",
    palette: ["#2563eb", "#3b82f6", "#93c5fd"],
    bg: "linear-gradient(135deg, #2563eb22, #93c5fd22)",
    desc: "Blues and greens, clean lines, professional feel",
  },
  {
    id: "minimal",
    label: "Minimal & Elegant",
    palette: ["#e5e7eb", "#9ca3af", "#1f2937"],
    bg: "linear-gradient(135deg, #9ca3af22, #1f293722)",
    desc: "Neutral tones, whitespace, refined simplicity",
  },
  {
    id: "dark",
    label: "Dark & Premium",
    palette: ["#7c6af7", "#a78bfa", "#1e1b4b"],
    bg: "linear-gradient(135deg, #7c6af722, #1e1b4b44)",
    desc: "Deep backgrounds, glows, luxury aesthetic",
  },
  {
    id: "playful",
    label: "Playful & Creative",
    palette: ["#f97316", "#a3e635", "#fb7185"],
    bg: "linear-gradient(135deg, #f9731622, #a3e63522)",
    desc: "Vibrant mix, rounded shapes, fun personality",
  },
  {
    id: "earthy",
    label: "Natural & Organic",
    palette: ["#78350f", "#a3a3a3", "#d9f99d"],
    bg: "linear-gradient(135deg, #78350f22, #d9f99d22)",
    desc: "Warm earth tones, sustainable, approachable",
  },
];

const STYLES = ["Flat / Solid", "Glassmorphic", "Neumorphic", "Brutalist", "Illustrative"];

export default function MoodBoard() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const { setMoodSelection, setStep, syncVitalsFromAnswers } = useLucidraftStore();

  const canContinue = selectedMood && selectedStyle;

  function handleContinue() {
    const mood = MOODS.find((m) => m.id === selectedMood)!;
    setMoodSelection({
      palette: mood.palette,
      mood: mood.label,
      style: selectedStyle!,
    });
    syncVitalsFromAnswers();
    setStep("blueprint");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="mb-8">
        <span
          className="text-xs px-2 py-0.5 rounded-full glass"
          style={{ color: "var(--accent)" }}
        >
          Visual Identity
        </span>
        <h2
          className="text-2xl font-semibold mt-3 mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          What's the vibe?
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Choose the visual direction that resonates with your brand.
        </p>
      </div>

      {/* Mood grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {MOODS.map((mood, i) => {
          const active = selectedMood === mood.id;
          return (
            <motion.button
              key={mood.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelectedMood(mood.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-left p-4 rounded-xl transition-all duration-200"
              style={{
                background: active ? mood.bg : "var(--bg-glass)",
                border: `1px solid ${active ? "rgba(124,106,247,0.4)" : "var(--border-glass)"}`,
              }}
            >
              {/* Palette swatches */}
              <div className="flex gap-1.5 mb-3">
                {mood.palette.map((color) => (
                  <div
                    key={color}
                    className="w-6 h-6 rounded-full"
                    style={{ background: color }}
                  />
                ))}
              </div>
              <p
                className="text-sm font-medium mb-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {mood.label}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {mood.desc}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Style selector */}
      <div className="mb-8">
        <p className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>
          Design style
        </p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((style) => {
            const active = selectedStyle === style;
            return (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className="px-4 py-2 rounded-full text-sm transition-all duration-150"
                style={{
                  background: active ? "rgba(124,106,247,0.18)" : "var(--bg-glass)",
                  border: `1px solid ${active ? "rgba(124,106,247,0.5)" : "var(--border-glass)"}`,
                  color: active ? "#a78bfa" : "var(--text-muted)",
                }}
              >
                {style}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep("questions")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm glass glass-hover transition-all"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <motion.button
          onClick={handleContinue}
          disabled={!canContinue}
          whileHover={canContinue ? { scale: 1.03 } : {}}
          whileTap={canContinue ? { scale: 0.97 } : {}}
          className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium"
          style={{
            background: canContinue
              ? "linear-gradient(135deg, #7c6af7, #60a5fa)"
              : "var(--bg-glass)",
            color: canContinue ? "#fff" : "var(--text-muted)",
            cursor: canContinue ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          Build blueprint
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
}
