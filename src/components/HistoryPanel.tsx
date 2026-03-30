"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLucidraftStore } from "@/lib/store";
import { SavedBlueprint } from "@/types";
import BlueprintDiff from "./BlueprintDiff";

const COMPLEXITY_DOT: Record<string, string> = {
  Simple: "#4ade80",
  Medium: "#facc15",
  Complex: "#f87171",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function BlueprintCard({
  blueprint,
  onLoad,
  onDelete,
  compareMode,
  selected,
  onToggleSelect,
  selectionFull,
}: {
  blueprint: SavedBlueprint;
  onLoad: () => void;
  onDelete: () => void;
  compareMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  selectionFull: boolean; // 2 already chosen (and this card is not one of them)
}) {
  const dot = COMPLEXITY_DOT[blueprint.analysis.complexity] ?? "#a78bfa";
  const pitchPreview =
    blueprint.pitch.length > 90
      ? blueprint.pitch.slice(0, 90) + "…"
      : blueprint.pitch;

  const dimmed = compareMode && selectionFull && !selected;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dimmed ? 0.35 : 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="glass rounded-xl p-4 group relative"
      style={selected ? { borderColor: "rgba(124,106,247,0.6)", borderWidth: 1 } : undefined}
      onClick={compareMode ? onToggleSelect : undefined}
    >
      {/* Compare mode checkbox */}
      {compareMode && (
        <div
          className="absolute top-3 right-3 w-5 h-5 rounded flex items-center justify-center transition-all"
          style={{
            background: selected ? "#7c6af7" : "var(--bg-glass)",
            border: `1px solid ${selected ? "#7c6af7" : "var(--border-glass)"}`,
          }}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}

      {/* Category + complexity */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: "rgba(124,106,247,0.12)", color: "#a78bfa" }}
        >
          {blueprint.analysis.primaryCategory}
        </span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {blueprint.analysis.complexity}
          </span>
        </div>
        <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
          {timeAgo(blueprint.savedAt)}
        </span>
      </div>

      {/* Pitch excerpt */}
      <p className="text-xs leading-relaxed mb-3 italic" style={{ color: "var(--text-muted)" }}>
        &ldquo;{pitchPreview}&rdquo;
      </p>

      {/* Stack tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {blueprint.analysis.suggestedTechStack.slice(0, 3).map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
          >
            {t}
          </span>
        ))}
        {blueprint.analysis.suggestedTechStack.length > 3 && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            +{blueprint.analysis.suggestedTechStack.length - 3}
          </span>
        )}
      </div>

      {/* Actions (hidden in compare mode) */}
      {!compareMode && (
        <div className="flex items-center gap-2">
          <button
            onClick={onLoad}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "linear-gradient(135deg, #7c6af7, #60a5fa)", color: "#fff", border: "none" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Open
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg glass glass-hover transition-all opacity-0 group-hover:opacity-100"
            style={{ color: "#f87171" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Compare mode hint */}
      {compareMode && !selected && !selectionFull && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Click to select</p>
      )}
      {compareMode && selected && (
        <p className="text-xs" style={{ color: "#a78bfa" }}>Selected</p>
      )}
    </motion.div>
  );
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const { savedBlueprints, loadBlueprint, deleteBlueprint } = useLucidraftStore();
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [diffPair, setDiffPair] = useState<[SavedBlueprint, SavedBlueprint] | null>(null);

  function handleLoad(id: string) {
    loadBlueprint(id);
    onClose();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, id];
    });
  }

  function handleCompare() {
    if (selectedIds.length !== 2) return;
    const [bp1, bp2] = selectedIds.map((id) => savedBlueprints.find((b) => b.id === id)!);
    // Sort so older = baseline
    const sorted = [bp1, bp2].sort(
      (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
    ) as [SavedBlueprint, SavedBlueprint];
    setDiffPair(sorted);
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelectedIds([]);
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 h-full z-50 flex flex-col"
              style={{
                width: "min(380px, 92vw)",
                background: "rgba(10,10,15,0.97)",
                borderLeft: "1px solid var(--border-glass)",
                backdropFilter: "blur(24px)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--border-glass)" }}
              >
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Blueprint history
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {savedBlueprints.length} saved{savedBlueprints.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Compare toggle */}
                  {savedBlueprints.length >= 2 && (
                    <button
                      onClick={() => (compareMode ? exitCompareMode() : setCompareMode(true))}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: compareMode ? "rgba(124,106,247,0.2)" : "var(--bg-glass)",
                        color: compareMode ? "#a78bfa" : "var(--text-muted)",
                        border: `1px solid ${compareMode ? "rgba(124,106,247,0.4)" : "var(--border-glass)"}`,
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 20V10M12 20V4M6 20v-6" />
                      </svg>
                      Compare
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="glass glass-hover rounded-full w-8 h-8 flex items-center justify-center transition-all"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Compare mode banner */}
              <AnimatePresence>
                {compareMode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-5 py-3 flex items-center justify-between"
                      style={{ background: "rgba(124,106,247,0.08)", borderBottom: "1px solid rgba(124,106,247,0.2)" }}
                    >
                      <p className="text-xs" style={{ color: "#a78bfa" }}>
                        {selectedIds.length === 0 && "Select two blueprints to compare"}
                        {selectedIds.length === 1 && "Select one more"}
                        {selectedIds.length === 2 && "Ready to compare"}
                      </p>
                      {selectedIds.length === 2 && (
                        <button
                          onClick={handleCompare}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium"
                          style={{ background: "linear-gradient(135deg, #7c6af7, #60a5fa)", color: "#fff", border: "none" }}
                        >
                          View diff →
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {savedBlueprints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <div
                      className="w-10 h-10 rounded-full glass flex items-center justify-center mb-3"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No saved blueprints yet
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                      Click &ldquo;Save to history&rdquo; on a blueprint
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {savedBlueprints.map((bp) => (
                      <BlueprintCard
                        key={bp.id}
                        blueprint={bp}
                        onLoad={() => handleLoad(bp.id)}
                        onDelete={() => deleteBlueprint(bp.id)}
                        compareMode={compareMode}
                        selected={selectedIds.includes(bp.id)}
                        onToggleSelect={() => toggleSelect(bp.id)}
                        selectionFull={selectedIds.length === 2 && !selectedIds.includes(bp.id)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer hint */}
              {savedBlueprints.length > 0 && (
                <div
                  className="px-5 py-3 text-xs text-center"
                  style={{ borderTop: "1px solid var(--border-glass)", color: "var(--text-muted)" }}
                >
                  {compareMode
                    ? "Click cards to select · cancel with Compare button"
                    : "Stored locally in your browser · up to 20 blueprints"}
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Diff overlay — rendered outside the drawer so it covers full screen */}
      <AnimatePresence>
        {diffPair && (
          <BlueprintDiff
            a={diffPair[0]}
            b={diffPair[1]}
            onClose={() => {
              setDiffPair(null);
              exitCompareMode();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
