import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const DynamicQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["text", "select", "multiselect", "textarea"]),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});

const AnalysisSchema = z.object({
  primaryCategory: z.enum(["Web", "Mobile", "Desktop", "Unknown"]),
  complexity: z.enum(["Simple", "Medium", "Complex"]),
  summary: z.string(),
  suggestedTechStack: z.array(z.string()),
  dynamicQuestions: z.array(DynamicQuestionSchema),
  visualRequirements: z.boolean(),
});

const SYSTEM_PROMPT = `You are Lucidraft, an expert software project consultant.
Given a user's project pitch, perform a deep analysis and return a JSON object.

Return ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "primaryCategory": "Web" | "Mobile" | "Desktop" | "Unknown",
  "complexity": "Simple" | "Medium" | "Complex",
  "summary": "one sentence describing what you understood",
  "suggestedTechStack": ["tech1", "tech2", "tech3"],
  "dynamicQuestions": [
    {
      "id": "unique_snake_case_id",
      "label": "Question text?",
      "type": "text" | "select" | "multiselect" | "textarea",
      "placeholder": "optional hint",
      "options": ["option1", "option2"],
      "required": true
    }
  ],
  "visualRequirements": true | false
}

Rules for dynamicQuestions — generate exactly 6-8 questions covering ALL of these areas (skip any already answered in the pitch):

1. PRIMARY AUDIENCE — Who is the primary user? (select: e.g. "Consumers (B2C)", "Businesses (B2B)", "Internal team", "Developers / API users")
2. SECONDARY AUDIENCE — Is there a secondary user group? (select with a "None" option)
3. AUTHENTICATION — What login/auth is needed? (multiselect: "Email & password", "Google / social login", "Magic link", "SSO / SAML", "No login required", "Other")
4. HOSTING — Where will this be deployed? (select: "Vercel / Netlify", "AWS", "GCP", "Azure", "Self-hosted / VPS", "Not decided yet")
5. INTEGRATIONS — Any third-party services to connect? (multiselect: payment, email, CRM, analytics, maps, AI, etc. — tailor options to the project)
6. CORE FEATURE PRIORITY — Which features are MVP vs nice-to-have? (textarea)
7. PROJECT-SPECIFIC question 1 — Something uniquely relevant to this project type
8. PROJECT-SPECIFIC question 2 — Another uniquely relevant detail (e.g. offline support for mobile, multi-tenancy for SaaS, data import for tools)

Additional rules:
- Use "select" or "multiselect" for categorical choices with 3-6 relevant options
- Use "textarea" for open-ended detail, "text" for short single answers
- Set visualRequirements: true if brand identity, colors, logo or UI design is undefined
- suggestedTechStack: top 4-6 technologies best suited for the project
- complexity: Simple = 1-2 weeks, Medium = 1-3 months, Complex = 3+ months`;

export async function POST(req: NextRequest) {
  try {
    const { pitch } = await req.json();

    if (!pitch || typeof pitch !== "string" || pitch.trim().length < 10) {
      return NextResponse.json(
        { error: "Pitch must be at least 10 characters." },
        { status: 400 }
      );
    }

    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this project pitch:\n\n"${pitch.trim()}"`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    const result = AnalysisSchema.parse(parsed);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[analyze] error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again." },
        { status: 500 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
