import type {
  AnalysisResult,
  AnswerMap,
  BlueprintDocument,
  MoodSelection,
  ProjectDetails,
  SavedBlueprint,
} from "@/types";

// ── shared analysis ───────────────────────────────────────────────────────────

export function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    primaryCategory: "Web",
    complexity: "Medium",
    summary: "A SaaS dashboard for marketing teams that tracks campaign performance.",
    suggestedTechStack: ["React", "Node.js", "PostgreSQL", "Tailwind CSS"],
    dynamicQuestions: [
      {
        id: "primary_audience",
        label: "Who is the primary user?",
        type: "select",
        options: ["Consumers (B2C)", "Businesses (B2B)", "Internal team"],
        required: true,
        placeholder: undefined,
      },
      {
        id: "auth_method",
        label: "What authentication is needed?",
        type: "multiselect",
        options: ["Email & password", "Google / social login", "SSO / SAML"],
        required: true,
        placeholder: undefined,
      },
      {
        id: "hosting_provider",
        label: "Where will this be deployed?",
        type: "select",
        options: ["Vercel / Netlify", "AWS", "GCP", "Azure"],
        required: true,
        placeholder: undefined,
      },
    ],
    visualRequirements: false,
    ...overrides,
  };
}

// ── project details ───────────────────────────────────────────────────────────

export function makeProjectDetails(overrides: Partial<ProjectDetails> = {}): ProjectDetails {
  return {
    projectName: "Acme Dashboard",
    domain: "app.acme.com",
    hosting: "Vercel",
    repository: "github.com/acme/dashboard",
    authMethod: "Email + Google OAuth",
    budgetRange: "£10k–£25k",
    targetLaunch: "Q3 2025",
    primaryContact: "Jane Smith, jane@acme.com",
    ...overrides,
  };
}

// ── saved blueprint ───────────────────────────────────────────────────────────

export function makeBlueprint(overrides: Partial<SavedBlueprint> = {}): SavedBlueprint {
  const analysis = makeAnalysis();
  return {
    id: "test-id-" + Math.random().toString(36).slice(2),
    savedAt: new Date("2025-01-15T10:00:00Z").toISOString(),
    pitch: "A SaaS dashboard for marketing teams that tracks campaign performance across all channels.",
    analysis,
    answers: {
      primary_audience: "Businesses (B2B)",
      auth_method: ["Email & password", "Google / social login"],
      hosting_provider: "Vercel / Netlify",
    } as AnswerMap,
    moodSelection: null,
    suggestions: "",
    projectDetails: makeProjectDetails(),
    ...overrides,
  };
}

// ── blueprint document ────────────────────────────────────────────────────────

export function makeBlueprintDoc(overrides: Partial<BlueprintDocument> = {}): BlueprintDocument {
  return {
    executive_summary: "A comprehensive SaaS analytics platform built for marketing teams.",
    technical_architecture: {
      backend: "Node.js with Express — lightweight and well-suited for REST APIs.",
      frontend: "React with Zustand for state management — battle-tested for dashboards.",
      database: "PostgreSQL — relational model fits structured campaign data.",
      infrastructure: "Vercel for frontend, Railway for backend API.",
    },
    work_breakdown_structure: [
      {
        name: "MVP Setup",
        tasks: [
          { name: "Project scaffolding", priority: "Must-Have", estimated_effort: "Low" },
          { name: "CI/CD pipeline", priority: "Should-Have", estimated_effort: "Medium" },
        ],
      },
    ],
    risk_assessment: [
      { risk: "API rate limits from third-party platforms", mitigation_strategy: "Implement request queuing and exponential backoff." },
    ],
    data_model_preview: [
      { name: "User", relationships: ["has many Campaigns", "belongs to Organisation"] },
      { name: "Campaign", relationships: ["has many Metrics", "belongs to User"] },
    ],
    external_integrations: ["Stripe for billing", "Segment for analytics"],
    ...overrides,
  };
}

// ── mood ──────────────────────────────────────────────────────────────────────

export function makeMood(overrides: Partial<MoodSelection> = {}): MoodSelection {
  return {
    palette: ["#6366f1", "#818cf8", "#e0e7ff"],
    mood: "Calm & Trustworthy",
    style: "Minimalist",
    ...overrides,
  };
}

// ── valid OpenAI analysis response body ───────────────────────────────────────

export const VALID_ANALYSIS_JSON = {
  primaryCategory: "Web",
  complexity: "Medium",
  summary: "A SaaS dashboard for marketing teams.",
  suggestedTechStack: ["React", "Node.js", "PostgreSQL"],
  dynamicQuestions: [
    {
      id: "primary_audience",
      label: "Who is the primary user?",
      type: "select",
      placeholder: null,
      options: ["Consumers (B2C)", "Businesses (B2B)"],
      required: true,
    },
  ],
  visualRequirements: false,
};

// ── valid OpenAI blueprint response body ─────────────────────────────────────

export const VALID_BLUEPRINT_JSON = {
  executive_summary: "A SaaS analytics platform for marketing teams.",
  technical_architecture: {
    backend: "Node.js with Express.",
    frontend: "React with Zustand.",
    database: "PostgreSQL.",
    infrastructure: "Vercel + Railway.",
  },
  work_breakdown_structure: [
    {
      name: "Phase 1: MVP",
      tasks: [
        { name: "Scaffolding", priority: "Must-Have", estimated_effort: "Low" },
      ],
    },
  ],
  risk_assessment: [
    { risk: "API rate limits", mitigation_strategy: "Use exponential backoff." },
  ],
  data_model_preview: [
    { name: "User", relationships: ["has many Campaigns"] },
  ],
  external_integrations: ["Stripe", "Segment"],
};
