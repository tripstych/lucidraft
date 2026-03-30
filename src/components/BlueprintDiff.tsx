"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { SavedBlueprint } from "@/types";
import { diffBlueprints, diffToPlainText } from "@/lib/diff";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ComplexityDot({ level }: { level: string }) {
  const color =
    level === "Simple" ? "#4ade80" : level === "Medium" ? "#facc15" : "#f87171";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5"
      style={{ background: color }}
    />
  );
}

function Arrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
      style={{ color: "var(--text-muted)" }}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function ChangeWarning() {
  return (
    <span
      className="ml-2 text-xs px-1.5 py-0.5 rounded"
      style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}
    >
      changed
    </span>
  );
}

interface Props {
  a: SavedBlueprint; // baseline (older)
  b: SavedBlueprint; // current (newer)
  onClose: () => void;
}

export default function BlueprintDiff({ a, b, onClose }: Props) {
  const diff = diffBlueprints(a, b);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleCopy() {
    const text = diffToPlainText(a, b, diff);
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function handlePrint() {
    window.print();
  }

  const hasChanges =
    diff.categoryChanged ||
    diff.complexityChanged ||
    diff.stackAdded.length > 0 ||
    diff.stackRemoved.length > 0 ||
    diff.changedVitals.length > 0 ||
    diff.changedAnswers.length > 0;

  return (
    <motion.div
      id="blueprint-diff"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── header ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: "var(--bg-base)", borderColor: "var(--border-glass)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Scope Change Report
          </span>
          {!hasChanges && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
              No differences found
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass glass-hover transition-all"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy report
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass glass-hover transition-all"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass glass-hover transition-all"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>
      </div>

      {/* ── body ── */}
      <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-8">

        {/* Version headers */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Baseline", bp: a },
            { label: "Current", bp: b },
          ].map(({ label, bp }) => (
            <div
              key={label}
              className="rounded-xl p-4 glass"
              style={{
                borderLeft: `3px solid ${label === "Baseline" ? "rgba(124,106,247,0.6)" : "rgba(96,165,250,0.6)"}`,
              }}
            >
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
                {label}
              </div>
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                {fmt(bp.savedAt)}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {bp.pitch.length > 120 ? bp.pitch.slice(0, 120) + "…" : bp.pitch}
              </p>
            </div>
          ))}
        </div>

        {/* ── Overview ── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
            Overview
          </h2>
          <div className="glass rounded-xl divide-y" style={{ borderColor: "var(--border-glass)" }}>

            {/* Category */}
            <div className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="w-28 flex-shrink-0" style={{ color: "var(--text-muted)" }}>Category</span>
              <span style={{ color: "var(--text-primary)" }}>{a.analysis.primaryCategory}</span>
              {diff.categoryChanged && (
                <>
                  <Arrow />
                  <span style={{ color: "#60a5fa" }}>{b.analysis.primaryCategory}</span>
                  <ChangeWarning />
                </>
              )}
            </div>

            {/* Complexity */}
            <div className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="w-28 flex-shrink-0" style={{ color: "var(--text-muted)" }}>Complexity</span>
              <span style={{ color: "var(--text-primary)" }}>
                <ComplexityDot level={a.analysis.complexity} />{a.analysis.complexity}
              </span>
              {diff.complexityChanged && (
                <>
                  <Arrow />
                  <span style={{ color: "#60a5fa" }}>
                    <ComplexityDot level={b.analysis.complexity} />{b.analysis.complexity}
                  </span>
                  <ChangeWarning />
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Tech Stack ── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
            Tech Stack
          </h2>
          <div className="glass rounded-xl px-5 py-4 flex flex-wrap gap-2">
            {diff.stackUnchanged.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full text-xs" style={{ background: "var(--bg-glass)", color: "var(--text-muted)", border: "1px solid var(--border-glass)" }}>
                {t}
              </span>
            ))}
            {diff.stackRemoved.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full text-xs line-through" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>
                − {t}
              </span>
            ))}
            {diff.stackAdded.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full text-xs" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                + {t}
              </span>
            ))}
            {diff.stackAdded.length === 0 && diff.stackRemoved.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>No stack changes</span>
            )}
          </div>
          {(diff.stackAdded.length > 0 || diff.stackRemoved.length > 0) && (
            <div className="flex gap-4 mt-2 px-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "#4ade80" }}>+ added</span>
              <span style={{ color: "#f87171" }}>− removed</span>
              <span>unchanged</span>
            </div>
          )}
        </section>

        {/* ── Project Vitals ── */}
        {diff.changedVitals.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
              Project Vitals Changes
            </h2>
            <div className="glass rounded-xl divide-y" style={{ borderColor: "var(--border-glass)" }}>
              {diff.changedVitals.map(({ key, label, before, after }) => (
                <div key={String(key)} className="grid grid-cols-[7rem_1fr_auto_1fr] items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex-shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ color: before ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {before || <em>empty</em>}
                  </span>
                  <Arrow />
                  <span style={{ color: "#60a5fa" }}>{after || <em>empty</em>}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Q&A Changes ── */}
        {diff.changedAnswers.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
              Q&amp;A Changes
            </h2>
            <div className="space-y-3">
              {diff.changedAnswers.map(({ id, label, before, after }) => (
                <div key={id} className="glass rounded-xl px-5 py-4">
                  <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>{label}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs mb-1" style={{ color: "rgba(248,113,113,0.8)" }}>Baseline</div>
                      <div
                        className="px-3 py-2 rounded-lg text-xs"
                        style={{ background: "rgba(248,113,113,0.08)", color: before ? "var(--text-primary)" : "var(--text-muted)", border: "1px solid rgba(248,113,113,0.2)" }}
                      >
                        {before || "(no answer)"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: "rgba(96,165,250,0.8)" }}>Current</div>
                      <div
                        className="px-3 py-2 rounded-lg text-xs"
                        style={{ background: "rgba(96,165,250,0.08)", color: after ? "var(--text-primary)" : "var(--text-muted)", border: "1px solid rgba(96,165,250,0.2)" }}
                      >
                        {after || "(no answer)"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!hasChanges && (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm">These two blueprints are identical in all tracked fields.</p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body > *:not(#blueprint-diff) { display: none !important; }
          #blueprint-diff { position: static !important; overflow: visible !important; }
          #blueprint-diff button { display: none !important; }
        }
      `}</style>
    </motion.div>
  );
}
