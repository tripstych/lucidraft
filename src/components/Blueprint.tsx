"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLucidraftStore } from "@/lib/store";
import { AnalysisResult, MoodSelection, ProjectDetails } from "@/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

const COMPLEXITY_DOT: Record<string, string> = {
  Simple: "#4ade80",
  Medium: "#facc15",
  Complex: "#f87171",
};

function formatDate(iso?: string) {
  return new Date(iso ?? Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const VITALS_LABELS: Record<string, string> = {
  projectName: "Project name",
  domain: "Domain / URL",
  hosting: "Hosting / deployment",
  repository: "Repository",
  authMethod: "Authentication",
  budgetRange: "Budget range",
  targetLaunch: "Target launch",
  primaryContact: "Primary contact",
};

function buildPlainText(
  pitch: string,
  analysis: AnalysisResult,
  answers: Record<string, string | string[]>,
  mood: MoodSelection | null,
  suggestions: string,
  projectDetails: ProjectDetails
): string {
  const lines: string[] = [
    "PROJECT BLUEPRINT — Lucidraft",
    `Date: ${formatDate()}`,
    "",
    "SUMMARY",
    analysis.summary,
    "",
    `Category: ${analysis.primaryCategory}   Complexity: ${analysis.complexity}`,
    `Suggested Stack: ${analysis.suggestedTechStack.join(", ")}`,
    "",
    "ORIGINAL PITCH",
    `"${pitch}"`,
  ];

  const filledVitals = Object.entries(VITALS_LABELS).filter(([k]) => projectDetails[k]?.trim());
  if (filledVitals.length > 0) {
    lines.push("", "PROJECT VITALS");
    filledVitals.forEach(([k, label]) => lines.push(`${label}: ${projectDetails[k]}`));
  }

  lines.push(
    "",
    "DISCOVERY Q&A",
    ...analysis.dynamicQuestions.map((q) => {
      const a = answers[q.id];
      const val = Array.isArray(a) ? a.join(", ") : a || "—";
      return `• ${q.label}\n  ${val}`;
    })
  );

  if (mood) {
    lines.push("", "VISUAL IDENTITY", `Mood: ${mood.mood}`, `Style: ${mood.style}`);
  }

  lines.push(
    "",
    "NEXT STEPS",
    "1. Share this blueprint with your development team",
    "2. Schedule a kickoff call to align on scope",
    "3. Request a detailed quote based on complexity",
    analysis.visualRequirements
      ? "4. Commission brand identity assets"
      : "4. Finalize wireframes and user flows"
  );

  if (suggestions.trim()) {
    lines.push("", "NOTES & SUGGESTIONS", suggestions.trim());
  }

  return lines.join("\n");
}

// ─── project vitals grid ─────────────────────────────────────────────────────

function VitalField({
  fieldKey,
  label,
  placeholder,
  editable,
}: {
  fieldKey: keyof ProjectDetails;
  label: string;
  placeholder: string;
  editable: boolean;
}) {
  const { projectDetails, setProjectDetail } = useLucidraftStore();
  const value = projectDetails[fieldKey] ?? "";

  return (
    <div>
      <p className="text-xs mb-1 font-medium" style={{ color: "#9ca3af" }}>{label}</p>
      {editable ? (
        <input
          type="text"
          value={value}
          onChange={(e) => setProjectDetail(fieldKey, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 rounded-lg text-xs outline-none transition-colors"
          style={{
            background: value ? "#f9fafb" : "#f3f4f6",
            border: `1px solid ${value ? "#e5e7eb" : "#e5e7eb"}`,
            color: "#374151",
          }}
        />
      ) : (
        <p className="text-sm" style={{ color: value ? "#1f2937" : "#d1d5db" }}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

const VITAL_FIELDS: { key: keyof ProjectDetails; label: string; placeholder: string }[] = [
  { key: "projectName",   label: "Project name",         placeholder: "e.g. Acme Dashboard" },
  { key: "domain",        label: "Domain / URL",          placeholder: "e.g. app.acme.com" },
  { key: "hosting",       label: "Hosting / deployment",  placeholder: "e.g. Vercel, AWS, self-hosted" },
  { key: "repository",    label: "Repository",            placeholder: "e.g. github.com/org/repo" },
  { key: "authMethod",    label: "Authentication",        placeholder: "e.g. Email + Google OAuth" },
  { key: "budgetRange",   label: "Budget range",          placeholder: "e.g. £5k–£15k" },
  { key: "targetLaunch",  label: "Target launch",         placeholder: "e.g. Q3 2025" },
  { key: "primaryContact",label: "Primary contact",       placeholder: "e.g. Jane Smith, jane@acme.com" },
];

function ProjectVitals({ editable }: { editable: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      {VITAL_FIELDS.map((f) => (
        <VitalField key={f.key} fieldKey={f.key} label={f.label} placeholder={f.placeholder} editable={editable} />
      ))}
    </div>
  );
}

// ─── editable answer row ──────────────────────────────────────────────────────

function EditableAnswer({
  questionId,
  label,
  index,
  options,
  multi,
}: {
  questionId: string;
  label: string;
  index: number;
  options?: string[];
  multi: boolean;
}) {
  const { answers, setAnswer } = useLucidraftStore();
  const [editing, setEditing] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && !hasOptions && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const raw = answers[questionId];
  const value: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const hasOptions = (options?.length ?? 0) > 0;
  const presetOptions = options ?? [];
  const customValues = value.filter((v) => !presetOptions.includes(v));

  function toggleOption(opt: string) {
    if (multi) {
      const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
      setAnswer(questionId, next);
    } else {
      setAnswer(questionId, opt);
      setEditing(false);
    }
  }

  function addCustom() {
    const val = customInput.trim();
    if (!val) return;
    if (multi) {
      if (!value.includes(val)) setAnswer(questionId, [...value, val]);
    } else {
      setAnswer(questionId, val);
      setEditing(false);
    }
    setCustomInput("");
  }

  return (
    <div className="group flex gap-4">
      <span
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
        style={{ background: "#ede9fe", color: "#7c6af7", minWidth: "1.25rem" }}
      >
        {index + 1}
      </span>
      <div className="flex-1">
        <p className="text-xs font-medium mb-1.5" style={{ color: "#6b7280" }}>{label}</p>

        {!editing ? (
          <div className="flex items-start gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {value.length > 0 ? (
                value.map((v) => (
                  <span key={v} className="px-2.5 py-0.5 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#1f2937" }}>
                    {v}
                  </span>
                ))
              ) : (
                <span className="text-sm" style={{ color: "#9ca3af" }}>—</span>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded mt-0.5"
              title="Edit answer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {hasOptions && presetOptions.map((opt) => {
              const active = value.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: active ? "#ede9fe" : "#f9fafb",
                    color: active ? "#7c6af7" : "#374151",
                    border: `1px solid ${active ? "#c4b5fd" : "#e5e7eb"}`,
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 flex items-center justify-center"
                    style={{ background: active ? "#7c6af7" : "#e5e7eb", border: `1px solid ${active ? "#7c6af7" : "#d1d5db"}` }}
                  >
                    {active && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
                  </span>
                  {opt}
                </button>
              );
            })}

            {/* Custom value chips */}
            {multi && customValues.length > 0 && (
              <div className="flex flex-wrap gap-1.5 py-1">
                {customValues.map((v) => (
                  <span key={v} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs" style={{ background: "#ede9fe", color: "#7c6af7", border: "1px solid #c4b5fd" }}>
                    {v}
                    <button onClick={() => setAnswer(questionId, value.filter((s) => s !== v))} className="opacity-60 hover:opacity-100">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Type your own */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <input
                ref={hasOptions ? customInputRef : inputRef}
                type="text"
                value={hasOptions ? customInput : (value[0] ?? "")}
                onChange={(e) => hasOptions ? setCustomInput(e.target.value) : setAnswer(questionId, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    hasOptions ? addCustom() : setEditing(false);
                  }
                }}
                placeholder={hasOptions ? "Type your own..." : "Your answer..."}
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: "#374151" }}
              />
              {hasOptions && customInput.trim() && (
                <button onClick={addCustom} className="text-xs px-2 py-0.5 rounded" style={{ background: "#7c6af7", color: "#fff", border: "none" }}>
                  {multi ? "Add" : "Use"}
                </button>
              )}
            </div>

            {hasOptions && (
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "#7c6af7", color: "#fff", border: "none" }}>
                Done
              </button>
            )}
            {!hasOptions && (
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "#7c6af7", color: "#fff", border: "none" }}>
                Save
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── the document itself ──────────────────────────────────────────────────────

interface DocumentProps {
  pitch: string;
  analysis: AnalysisResult;
  answers: Record<string, string | string[]>;
  mood: MoodSelection | null;
  suggestions: string;
  projectDetails: ProjectDetails;
  onSuggestionsChange?: (v: string) => void;
  editable?: boolean;
}

function BlueprintDocument({
  pitch,
  analysis,
  answers,
  mood,
  suggestions,
  onSuggestionsChange,
  editable = false,
}: DocumentProps) {
  const dotColor = COMPLEXITY_DOT[analysis.complexity] ?? "#a78bfa";

  return (
    <div id="blueprint-doc" className="blueprint-document" style={{ background: "#ffffff", color: "#1a1a2e", fontFamily: "'Inter', system-ui, sans-serif", borderRadius: "16px", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f0e1a 0%, #1a1640 100%)", padding: "28px 32px 24px" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c6af7, #60a5fa)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>LUCIDRAFT</span>
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{formatDate()}</span>
        </div>
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "#fff", letterSpacing: "-0.02em" }}>Project Blueprint</h1>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", maxWidth: "520px" }}>{analysis.summary}</p>
        <div className="flex items-center gap-2 mt-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(124,106,247,0.2)", color: "#a78bfa" }}>
            {analysis.primaryCategory}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{analysis.complexity} complexity</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 32px" }}>

        <section>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>Original pitch</p>
          <blockquote className="text-sm leading-relaxed" style={{ color: "#374151", borderLeft: "3px solid #7c6af7", paddingLeft: "14px", fontStyle: "italic" }}>
            {pitch}
          </blockquote>
        </section>

        <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "1.5rem 0" }} />

        <section>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>Suggested technology stack</p>
          <div className="flex flex-wrap gap-2">
            {analysis.suggestedTechStack.map((tech) => (
              <span key={tech} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "#f3f4f6", color: "#374151" }}>{tech}</span>
            ))}
          </div>
        </section>

        <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "1.5rem 0" }} />

        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>Project vitals</p>
            {editable && <span className="text-xs" style={{ color: "#c4b5fd" }}>Fill in as details are confirmed</span>}
          </div>
          <ProjectVitals editable={editable} />
        </section>

        <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "1.5rem 0" }} />

        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>Discovery Q&A</p>
            {editable && <span className="text-xs" style={{ color: "#c4b5fd" }}>Hover an answer to edit</span>}
          </div>
          <div className="space-y-5">
            {analysis.dynamicQuestions.map((q, i) =>
              editable ? (
                <EditableAnswer key={q.id} questionId={q.id} label={q.label} index={i} options={q.options} multi={q.type === "multiselect"} />
              ) : (
                <div key={q.id} className="flex gap-4">
                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5" style={{ background: "#ede9fe", color: "#7c6af7", minWidth: "1.25rem" }}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#6b7280" }}>{q.label}</p>
                    {(() => {
                      const raw = answers[q.id];
                      const val = Array.isArray(raw) ? raw : raw ? [raw] : [];
                      return val.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {val.map((v) => <span key={v} className="px-2.5 py-0.5 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#1f2937" }}>{v}</span>)}
                        </div>
                      ) : <p className="text-sm" style={{ color: "#9ca3af" }}>—</p>;
                    })()}
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {mood && (
          <>
            <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "1.5rem 0" }} />
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>Visual identity</p>
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  {mood.palette.map((c) => <div key={c} className="w-8 h-8 rounded-full" style={{ background: c, border: "2px solid rgba(0,0,0,0.06)" }} />)}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1f2937" }}>{mood.mood}</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{mood.style}</p>
                </div>
              </div>
            </section>
          </>
        )}

        <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "1.5rem 0" }} />

        <section>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#9ca3af" }}>Recommended next steps</p>
          <ol className="space-y-2.5">
            {[
              "Share this blueprint with your development team",
              "Schedule a kickoff call to align on scope",
              "Request a detailed quote based on complexity",
              analysis.visualRequirements ? "Commission brand identity assets" : "Finalize wireframes and user flows",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#374151" }}>
                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5" style={{ background: "#ede9fe", color: "#7c6af7" }}>{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        {(editable || suggestions.trim()) && (
          <>
            <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "1.5rem 0" }} />
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>Notes & suggestions</p>
              {editable && onSuggestionsChange ? (
                <textarea
                  value={suggestions}
                  onChange={(e) => onSuggestionsChange(e.target.value)}
                  placeholder="Add client-facing notes, open questions, constraints, or anything else..."
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none leading-relaxed"
                  style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151" }}
                />
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: "#374151", whiteSpace: "pre-wrap" }}>{suggestions}</p>
              )}
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 32px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fafafa" }} className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "#d1d5db" }}>Generated by Lucidraft</p>
        <p className="text-xs" style={{ color: "#d1d5db" }}>lucidraft.app</p>
      </div>
    </div>
  );
}

// ─── fullscreen modal ─────────────────────────────────────────────────────────

function FullscreenPreview({ onClose, ...docProps }: DocumentProps & { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-10 glass glass-hover rounded-full w-9 h-9 flex items-center justify-center transition-all"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", maxWidth: "700px" }}
      >
        <BlueprintDocument {...docProps} editable={false} />
      </motion.div>
    </motion.div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function Blueprint() {
  const {
    analysis, answers, moodSelection, pitch,
    suggestions, setSuggestions,
    projectDetails,
    reset, saveBlueprint,
  } = useLucidraftStore();

  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = useCallback(() => {
    if (!analysis) return;
    const text = buildPlainText(pitch, analysis, answers, moodSelection, suggestions, projectDetails);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [pitch, analysis, answers, moodSelection, suggestions, projectDetails]);

  const handleSave = useCallback(() => {
    saveBlueprint();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [saveBlueprint]);

  if (!analysis) return null;

  const docProps: DocumentProps = {
    pitch, analysis, answers,
    mood: moodSelection,
    suggestions,
    projectDetails,
    onSuggestionsChange: setSuggestions,
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl mx-auto"
      >
        {/* Status */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Blueprint ready</span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate()}</span>
        </div>

        {/* Inline document — editable */}
        <div className="rounded-2xl overflow-hidden mb-5" style={{ border: "1px solid var(--border-glass)", boxShadow: "0 0 40px rgba(124,106,247,0.12)" }}>
          <BlueprintDocument {...docProps} editable={true} />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            onClick={() => setFullscreen(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "linear-gradient(135deg, #7c6af7, #60a5fa)", color: "#fff", border: "none" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Full preview
          </motion.button>

          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm glass glass-hover transition-all" style={{ color: saved ? "#4ade80" : "var(--text-muted)" }}>
            {saved ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Saved</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>Save to history</>
            )}
          </button>

          <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm glass glass-hover transition-all" style={{ color: copied ? "#4ade80" : "var(--text-muted)" }}>
            {copied ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Copied</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>Copy brief</>
            )}
          </button>

          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm glass glass-hover transition-all print:hidden" style={{ color: "var(--text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>

          <div className="ml-auto">
            <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs glass glass-hover transition-all" style={{ color: "var(--text-muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 109-9M3 3v6h6" />
              </svg>
              New project
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {fullscreen && <FullscreenPreview {...docProps} editable={false} onClose={() => setFullscreen(false)} />}
      </AnimatePresence>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #blueprint-doc { display: block !important; }
          .blueprint-document { border-radius: 0 !important; box-shadow: none !important; }
        }
      `}</style>
    </>
  );
}
