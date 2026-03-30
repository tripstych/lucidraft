export type ProjectCategory = "Web" | "Mobile" | "Desktop" | "Unknown";

export type QuestionType = "text" | "select" | "multiselect" | "textarea";

export interface DynamicQuestion {
  id: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface AnalysisResult {
  primaryCategory: ProjectCategory;
  suggestedTechStack: string[];
  dynamicQuestions: DynamicQuestion[];
  visualRequirements: boolean;
  complexity: "Simple" | "Medium" | "Complex";
  summary: string;
}

export interface AnswerMap {
  [questionId: string]: string | string[];
}

export interface MoodSelection {
  palette: string[];
  mood: string;
  style: string;
}

export type AppStep =
  | "pitch"
  | "analyzing"
  | "questions"
  | "moodboard"
  | "blueprint";

export interface ProjectDetails {
  domain: string;
  hosting: string;
  repository: string;
  authMethod: string;
  budgetRange: string;
  targetLaunch: string;
  primaryContact: string;
  projectName: string;
  [key: string]: string; // allow future fields
}

export const DEFAULT_PROJECT_DETAILS: ProjectDetails = {
  projectName: "",
  domain: "",
  hosting: "",
  repository: "",
  authMethod: "",
  budgetRange: "",
  targetLaunch: "",
  primaryContact: "",
};

export interface SavedBlueprint {
  id: string;
  savedAt: string; // ISO timestamp
  pitch: string;
  analysis: AnalysisResult;
  answers: AnswerMap;
  moodSelection: MoodSelection | null;
  suggestions: string;
  projectDetails: ProjectDetails;
  blueprintDoc?: BlueprintDocument; // optional — absent for blueprints saved before this feature
}

// ── blueprint document (second LLM pass) ─────────────────────────────────────

export interface BlueprintTask {
  name: string;
  priority: "Must-Have" | "Should-Have";
  estimated_effort: "Low" | "Medium" | "High";
}

export interface BlueprintPhase {
  name: string;
  tasks: BlueprintTask[];
}

export interface BlueprintRisk {
  risk: string;
  mitigation_strategy: string;
}

export interface BlueprintEntity {
  name: string;
  relationships: string[];
}

export interface BlueprintTechArch {
  backend: string;
  frontend: string;
  database: string;
  infrastructure: string;
}

export interface BlueprintDocument {
  executive_summary: string;
  technical_architecture: BlueprintTechArch;
  work_breakdown_structure: BlueprintPhase[];
  risk_assessment: BlueprintRisk[];
  data_model_preview: BlueprintEntity[];
  external_integrations: string[];
}

// ── diff types ────────────────────────────────────────────────────────────────

export interface BlueprintDiff {
  categoryChanged: boolean;
  complexityChanged: boolean;
  stackAdded: string[];
  stackRemoved: string[];
  stackUnchanged: string[];
  changedVitals: Array<{
    key: keyof ProjectDetails;
    label: string;
    before: string;
    after: string;
  }>;
  changedAnswers: Array<{
    id: string;
    label: string;
    before: string;
    after: string;
  }>;
}
