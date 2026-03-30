"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLucidraftStore } from "@/lib/store";
import { AnalysisResult, BlueprintDocument, MoodSelection, ProjectDetails } from "@/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

const COMPLEXITY_DOT: Record<string, string> = {
  Simple: "#4ade80",
  Medium: "#facc15",
  Complex: "#f87171",
};

const EFFORT_COLOR: Record<string, string> = {
  Low: "#4ade80",
  Medium: "#facc15",
  High: "#f87171",
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
  projectDetails: ProjectDetails,
  doc: BlueprintDocument | null
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

  if (doc) {
    lines.push("", "EXECUTIVE SUMMARY", doc.executive_summary);

    lines.push(
      "",
      "TECHNICAL ARCHITECTURE",
      `Backend:        ${doc.technical_architecture.backend}`,
      `Frontend:       ${doc.technical_architecture.frontend}`,
      `Database:       ${doc.technical_architecture.database}`,
      `Infrastructure: ${doc.technical_architecture.infrastructure}`
    );

    lines.push("", "WORK BREAKDOWN STRUCTURE");
    doc.work_breakdown_structure.forEach((phase) => {
      lines.push(`\n${phase.name}`);
      phase.tasks.forEach((t) => lines.push(`  [${t.priority}] [${t.estimated_effort}] ${t.name}`));
    });

    lines.push("", "RISK ASSESSMENT");
    doc.risk_assessment.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.risk}`);
      lines.push(`   Mitigation: ${r.mitigation_strategy}`);
    });

    lines.push("", "DATA MODEL");
    doc.data_model_preview.forEach((e) => {
      lines.push(`• ${e.name}: ${e.relationships.join("; ")}`);
    });

    lines.push("", "EXTERNAL INTEGRATIONS", ...doc.external_integrations.map((i) => `• ${i}`));
  }

  if (mood) {
    lines.push("", "VISUAL IDENTITY", `Mood: ${mood.mood}`, `Style: ${mood.style}`);
  }

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
            border: "1px solid #e5e7eb",
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
  { key: "projectName",    label: "Project name",         placeholder: "e.g. Acme Dashboard" },
  { key: "domain",         label: "Domain / URL",          placeholder: "e.g. app.acme.com" },
  { key: "hosting",        label: "Hosting / deployment",  placeholder: "e.g. Vercel, AWS, self-hosted" },
  { key: "repository",     label: "Repository",            placeholder: "e.g. github.com/org/repo" },
  { key: "authMethod",     label: "Authentication",        placeholder: "e.g. Email + Google OAuth" },
  { key: "budgetRange",    label: "Budget range",          placeholder: "e.g. £5k–£15k" },
  { key: "targetLaunch",   label: "Target launch",         placeholder: "e.g. Q3 2025" },
  { key: "primaryContact", label: "Primary contact",       placeholder: "e.g. Jane Smith, jane@acme.com" },
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
  options?: string[] | null;
  multi: boolean;
}) {
  const { answers, setAnswer } = useLucidraftStore();
  const [editing, setEditing] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const raw = answers[questionId];
  const value: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const hasOptions = (options?.length ?? 0) > 0;
  const presetOptions = options ?? [];
  const customValues = value.filter((v) => !presetOptions.includes(v));

  useEffect(() => {
    if (editing && !hasOptions && inputRef.current) inputRef.current.focus();
  }, [editing, hasOptions]);

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

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <input
                ref={hasOptions ? customInputRef : inputRef}
                type="text"
                value={hasOptions ? customInput : (value[0] ?? "")}
                onChange={(e) => hasOptions ? setCustomInput(e.target.value) : setAnswer(questionId, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); hasOptions ? addCustom() : setEditing(false); }
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

            <button onClick={() => setEditing(false)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "#7c6af7", color: "#fff", border: "none" }}>
              {hasOptions ? "Done" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── rich blueprint sections ─────────────────────────────────────────────────

function SectionDivider() {
  return <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "1.5rem 0" }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>
      {children}
    </p>
  );
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded" style={{ background: "#f3f4f6", width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}

function TechArchSection({ arch }: { arch: BlueprintDocument["technical_architecture"] }) {
  const rows = [
    { label: "Backend", value: arch.backend },
    { label: "Frontend", value: arch.frontend },
    { label: "Database", value: arch.database },
    { label: "Infrastructure", value: arch.infrastructure },
  ];
  return (
    <div className="space-y-3">
      {rows.map(({ label, value }) => (
        <div key={label}>
          <span className="text-xs font-semibold" style={{ color: "#7c6af7" }}>{label}</span>
          <p className="text-sm mt-0.5" style={{ color: "#374151", lineHeight: 1.6 }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function WBSSection({ phases }: { phases: BlueprintDocument["work_breakdown_structure"] }) {
  return (
    <div className="space-y-5">
      {phases.map((phase) => (
        <div key={phase.name}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#1f2937" }}>{phase.name}</p>
          <div className="space-y-1.5">
            {phase.tasks.map((task) => (
              <div key={task.name} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}>
                <span
                  className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium mt-0.5"
                  style={{ background: task.priority === "Must-Have" ? "#ede9fe" : "#f3f4f6", color: task.priority === "Must-Have" ? "#7c6af7" : "#6b7280" }}
                >
                  {task.priority === "Must-Have" ? "MVP" : "Later"}
                </span>
                <span className="flex-1 text-sm" style={{ color: "#374151" }}>{task.name}</span>
                <span
                  className="flex-shrink-0 text-xs font-medium"
                  style={{ color: EFFORT_COLOR[task.estimated_effort] }}
                >
                  {task.estimated_effort}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskSection({ risks }: { risks: BlueprintDocument["risk_assessment"] }) {
  return (
    <div className="space-y-3">
      {risks.map((r, i) => (
        <div key={i} className="rounded-lg p-3" style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)" }}>
          <div className="flex items-start gap-2 mb-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-sm font-medium" style={{ color: "#dc2626" }}>{r.risk}</p>
          </div>
          <p className="text-xs pl-5" style={{ color: "#6b7280", lineHeight: 1.6 }}>
            <span className="font-semibold" style={{ color: "#374151" }}>Mitigation: </span>
            {r.mitigation_strategy}
          </p>
        </div>
      ))}
    </div>
  );
}

function DataModelSection({ entities }: { entities: BlueprintDocument["data_model_preview"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {entities.map((e) => (
        <div key={e.name} className="rounded-lg px-3 py-2" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", minWidth: "120px" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#1f2937" }}>{e.name}</p>
          {e.relationships.map((r) => (
            <p key={r} className="text-xs" style={{ color: "#9ca3af" }}>↳ {r}</p>
          ))}
        </div>
      ))}
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
  blueprintDoc: BlueprintDocument | null;
  generating: boolean;
  onSuggestionsChange?: (v: string) => void;
  editable?: boolean;
}

function BlueprintDoc({
  pitch,
  analysis,
  answers,
  mood,
  suggestions,
  blueprintDoc,
  generating,
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
          {generating && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(167,139,250,0.8)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
              Generating blueprint…
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 32px" }}>

        {/* Executive summary */}
        {(blueprintDoc || generating) && (
          <>
            <section>
              <SectionLabel>Executive summary</SectionLabel>
              {blueprintDoc ? (
                <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>
                  {blueprintDoc.executive_summary}
                </p>
              ) : <Skeleton lines={3} />}
            </section>
            <SectionDivider />
          </>
        )}

        <section>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>Original pitch</p>
          <blockquote className="text-sm leading-relaxed" style={{ color: "#374151", borderLeft: "3px solid #7c6af7", paddingLeft: "14px", fontStyle: "italic" }}>
            {pitch}
          </blockquote>
        </section>

        <SectionDivider />

        <section>
          <SectionLabel>Suggested technology stack</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {analysis.suggestedTechStack.map((tech) => (
              <span key={tech} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "#f3f4f6", color: "#374151" }}>{tech}</span>
            ))}
          </div>
        </section>

        {/* Technical architecture */}
        {(blueprintDoc || generating) && (
          <>
            <SectionDivider />
            <section>
              <SectionLabel>Technical architecture</SectionLabel>
              {blueprintDoc ? (
                <TechArchSection arch={blueprintDoc.technical_architecture} />
              ) : <Skeleton lines={4} />}
            </section>
          </>
        )}

        <SectionDivider />

        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Project vitals</SectionLabel>
            {editable && <span className="text-xs" style={{ color: "#c4b5fd" }}>Fill in as details are confirmed</span>}
          </div>
          <ProjectVitals editable={editable} />
        </section>

        <SectionDivider />

        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Discovery Q&A</SectionLabel>
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

        {/* Work breakdown structure */}
        {(blueprintDoc || generating) && (
          <>
            <SectionDivider />
            <section>
              <SectionLabel>Work breakdown structure</SectionLabel>
              {blueprintDoc ? (
                <WBSSection phases={blueprintDoc.work_breakdown_structure} />
              ) : <Skeleton lines={6} />}
            </section>
          </>
        )}

        {/* Risk assessment */}
        {(blueprintDoc || generating) && (
          <>
            <SectionDivider />
            <section>
              <SectionLabel>Risk assessment</SectionLabel>
              {blueprintDoc ? (
                <RiskSection risks={blueprintDoc.risk_assessment} />
              ) : <Skeleton lines={3} />}
            </section>
          </>
        )}

        {/* Data model */}
        {(blueprintDoc || generating) && (
          <>
            <SectionDivider />
            <section>
              <SectionLabel>Data model preview</SectionLabel>
              {blueprintDoc ? (
                <DataModelSection entities={blueprintDoc.data_model_preview} />
              ) : <Skeleton lines={2} />}
            </section>
          </>
        )}

        {/* External integrations */}
        {blueprintDoc && blueprintDoc.external_integrations.length > 0 && (
          <>
            <SectionDivider />
            <section>
              <SectionLabel>External integrations</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {blueprintDoc.external_integrations.map((integration) => (
                  <span key={integration} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs" style={{ background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    {integration}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}

        {mood && (
          <>
            <SectionDivider />
            <section>
              <SectionLabel>Visual identity</SectionLabel>
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

        {(editable || suggestions.trim()) && (
          <>
            <SectionDivider />
            <section>
              <SectionLabel>Notes & suggestions</SectionLabel>
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
        <BlueprintDoc {...docProps} editable={false} />
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
    blueprintDoc, setBlueprintDoc,
    reset, saveBlueprint,
  } = useLucidraftStore();

  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Trigger blueprint generation on mount if not already available
  useEffect(() => {
    if (!analysis || blueprintDoc) return;

    async function generate() {
      setGenerating(true);
      setGenError("");
      try {
        const qaItems = analysis!.dynamicQuestions.map((q) => ({
          question: q.label,
          answer: (() => {
            const raw = answers[q.id];
            return Array.isArray(raw) ? raw.join(", ") : raw || "";
          })(),
        }));

        const res = await fetch("/api/blueprint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pitch,
            qaItems,
            suggestedTechStack: analysis!.suggestedTechStack,
            primaryCategory: analysis!.primaryCategory,
            complexity: analysis!.complexity,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Blueprint generation failed");
        }

        const doc: BlueprintDocument = await res.json();
        setBlueprintDoc(doc);
      } catch (err: unknown) {
        setGenError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setGenerating(false);
      }
    }

    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = useCallback(() => {
    if (!analysis) return;
    const text = buildPlainText(pitch, analysis, answers, moodSelection, suggestions, projectDetails, blueprintDoc);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [pitch, analysis, answers, moodSelection, suggestions, projectDetails, blueprintDoc]);

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
    blueprintDoc,
    generating,
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

        {genError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2"
            style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Blueprint generation failed: {genError}
          </motion.div>
        )}

        {/* Inline document — editable */}
        <div className="rounded-2xl overflow-hidden mb-5" style={{ border: "1px solid var(--border-glass)", boxShadow: "0 0 40px rgba(124,106,247,0.12)" }}>
          <BlueprintDoc {...docProps} editable={true} />
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
