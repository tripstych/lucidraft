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
}
