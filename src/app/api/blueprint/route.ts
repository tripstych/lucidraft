import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ── zod schemas ───────────────────────────────────────────────────────────────

const TaskSchema = z.object({
  name: z.string(),
  priority: z.enum(["Must-Have", "Should-Have"]),
  estimated_effort: z.enum(["Low", "Medium", "High"]),
});

const PhaseSchema = z.object({
  name: z.string(),
  tasks: z.array(TaskSchema),
});

const RiskSchema = z.object({
  risk: z.string(),
  mitigation_strategy: z.string(),
});

const EntitySchema = z.object({
  name: z.string(),
  relationships: z.array(z.string()),
});

const TechArchSchema = z.object({
  backend: z.string(),
  frontend: z.string(),
  database: z.string(),
  infrastructure: z.string(),
});

const BlueprintDocSchema = z.object({
  executive_summary: z.string(),
  technical_architecture: TechArchSchema,
  work_breakdown_structure: z.array(PhaseSchema),
  risk_assessment: z.array(RiskSchema),
  data_model_preview: z.array(EntitySchema),
  external_integrations: z.array(z.string()),
});

// ── structured outputs schema ─────────────────────────────────────────────────

const RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "blueprint_document",
    strict: true,
    schema: {
      type: "object",
      properties: {
        executive_summary: { type: "string" },
        technical_architecture: {
          type: "object",
          properties: {
            backend: { type: "string" },
            frontend: { type: "string" },
            database: { type: "string" },
            infrastructure: { type: "string" },
          },
          required: ["backend", "frontend", "database", "infrastructure"],
          additionalProperties: false,
        },
        work_breakdown_structure: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    priority: { type: "string", enum: ["Must-Have", "Should-Have"] },
                    estimated_effort: { type: "string", enum: ["Low", "Medium", "High"] },
                  },
                  required: ["name", "priority", "estimated_effort"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "tasks"],
            additionalProperties: false,
          },
        },
        risk_assessment: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk: { type: "string" },
              mitigation_strategy: { type: "string" },
            },
            required: ["risk", "mitigation_strategy"],
            additionalProperties: false,
          },
        },
        data_model_preview: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              relationships: { type: "array", items: { type: "string" } },
            },
            required: ["name", "relationships"],
            additionalProperties: false,
          },
        },
        external_integrations: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "executive_summary",
        "technical_architecture",
        "work_breakdown_structure",
        "risk_assessment",
        "data_model_preview",
        "external_integrations",
      ],
      additionalProperties: false,
    },
  },
};

// ── system prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the "Lucidraft Architect," a Senior Solutions Architect and Product Manager.
Your goal is to transform a raw project pitch and a series of discovery Q&A into a high-fidelity, actionable Project Blueprint.

Output requirements:

1. executive_summary: A 3-sentence high-level technical vision of the product.

2. technical_architecture:
   - backend: Recommended framework and why (1-2 sentences).
   - frontend: Recommended framework and state management (1-2 sentences).
   - database: Schema type (Relational vs. NoSQL) and why (1-2 sentences).
   - infrastructure: Specific services (e.g., "AWS Lambda for scraping," "Vercel for Edge") (1-2 sentences).

3. work_breakdown_structure: An array of Phases (e.g., MVP Setup, Core Engine, Frontend, Deployment).
   Each Phase contains tasks with a priority ("Must-Have" or "Should-Have") and estimated_effort ("Low", "Medium", or "High").
   Generate 3-5 phases, each with 3-6 tasks.

4. risk_assessment: Identify exactly 3 technical or business risks specific to this project's scope.
   Provide a mitigation_strategy for each.

5. data_model_preview: A list of 3-6 core entities and their relationships (e.g., "User has many Projects").

6. external_integrations: A list of specific APIs or SDKs required (e.g., "Stripe for payments", "OpenAI API for SEO generation").

Tone: Professional, concise, authoritative. Focus on HOW it will be built, not just what it is.
Flag Scope Creep if the user's answers contradict the original pitch.`;

// ── handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pitch, qaItems, suggestedTechStack, primaryCategory, complexity } = body;

    if (!pitch || !qaItems || !Array.isArray(qaItems)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const qaBlock = qaItems
      .map((item: { question: string; answer: string }, i: number) =>
        `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer || "(no answer)"}`
      )
      .join("\n\n");

    const userMessage = `
Original Pitch: "${pitch.trim()}"

Category: ${primaryCategory}  Complexity: ${complexity}
Current Tech Stack: ${suggestedTechStack?.join(", ") ?? "Not specified"}

Discovery Q&A:
${qaBlock}
`.trim();

    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: RESPONSE_FORMAT,
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    const result = BlueprintDocSchema.parse(parsed);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[blueprint] error:", err);
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
