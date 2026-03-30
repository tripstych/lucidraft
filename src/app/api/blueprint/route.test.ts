import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { VALID_BLUEPRINT_JSON } from "@/test/fixtures";

// ── mock OpenAI ───────────────────────────────────────────────────────────────

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

// ── import handler after mock is registered ───────────────────────────────────

const { POST } = await import("./route");

// ── helpers ───────────────────────────────────────────────────────────────────

const VALID_REQUEST_BODY = {
  pitch: "A SaaS analytics dashboard for marketing teams",
  qaItems: [
    { question: "Who is the primary user?", answer: "Businesses (B2B)" },
    { question: "What authentication is needed?", answer: "Email & password, Google OAuth" },
  ],
  suggestedTechStack: ["React", "Node.js", "PostgreSQL"],
  primaryCategory: "Web",
  complexity: "Medium",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/blueprint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockOpenAISuccess(payload: object) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

// ── request validation ────────────────────────────────────────────────────────

describe("POST /api/blueprint — request validation", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns 400 when qaItems is missing", async () => {
    const res = await POST(makeRequest({ pitch: "test", suggestedTechStack: [] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid request body/i);
  });

  it("returns 400 when qaItems is not an array", async () => {
    const res = await POST(makeRequest({ ...VALID_REQUEST_BODY, qaItems: "not an array" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the body is completely empty", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});

// ── successful response ───────────────────────────────────────────────────────

describe("POST /api/blueprint — successful response", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns 200 with a valid BlueprintDocument", async () => {
    mockOpenAISuccess(VALID_BLUEPRINT_JSON);
    const res = await POST(makeRequest(VALID_REQUEST_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.executive_summary).toBe("string");
    expect(typeof data.technical_architecture.backend).toBe("string");
    expect(Array.isArray(data.work_breakdown_structure)).toBe(true);
    expect(Array.isArray(data.risk_assessment)).toBe(true);
    expect(Array.isArray(data.data_model_preview)).toBe(true);
    expect(Array.isArray(data.external_integrations)).toBe(true);
  });

  it("formats Q&A items as numbered question/answer pairs in user message", async () => {
    mockOpenAISuccess(VALID_BLUEPRINT_JSON);
    await POST(makeRequest(VALID_REQUEST_BODY));
    const callArg = mockCreate.mock.calls[0][0];
    const userMessage = callArg.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("Q1: Who is the primary user?");
    expect(userMessage).toContain("A1: Businesses (B2B)");
    expect(userMessage).toContain("Q2: What authentication is needed?");
  });

  it("includes the pitch in the user message", async () => {
    mockOpenAISuccess(VALID_BLUEPRINT_JSON);
    await POST(makeRequest(VALID_REQUEST_BODY));
    const callArg = mockCreate.mock.calls[0][0];
    const userMessage = callArg.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("A SaaS analytics dashboard for marketing teams");
  });

  it("includes category and complexity in the user message", async () => {
    mockOpenAISuccess(VALID_BLUEPRINT_JSON);
    await POST(makeRequest(VALID_REQUEST_BODY));
    const callArg = mockCreate.mock.calls[0][0];
    const userMessage = callArg.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("Web");
    expect(userMessage).toContain("Medium");
  });

  it("sends a json_schema response_format to OpenAI", async () => {
    mockOpenAISuccess(VALID_BLUEPRINT_JSON);
    await POST(makeRequest(VALID_REQUEST_BODY));
    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.response_format?.type).toBe("json_schema");
    expect(callArg.response_format?.json_schema?.strict).toBe(true);
  });

  it("substitutes '(no answer)' for empty Q&A answers", async () => {
    mockOpenAISuccess(VALID_BLUEPRINT_JSON);
    await POST(
      makeRequest({
        ...VALID_REQUEST_BODY,
        qaItems: [{ question: "Skipped question?", answer: "" }],
      })
    );
    const callArg = mockCreate.mock.calls[0][0];
    const userMessage = callArg.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("(no answer)");
  });
});

// ── error handling ────────────────────────────────────────────────────────────

describe("POST /api/blueprint — error handling", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns 500 when OpenAI throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API unavailable"));
    const res = await POST(makeRequest(VALID_REQUEST_BODY));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("API unavailable");
  });

  it("returns 500 with a user-friendly message when AI returns invalid schema", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ bad: "data" }) } }],
    });
    const res = await POST(makeRequest(VALID_REQUEST_BODY));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/unexpected format/i);
  });

  it("returns 500 when AI returns malformed JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "{invalid json" } }],
    });
    const res = await POST(makeRequest(VALID_REQUEST_BODY));
    expect(res.status).toBe(500);
  });
});
