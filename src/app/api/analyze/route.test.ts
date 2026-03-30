import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { VALID_ANALYSIS_JSON } from "@/test/fixtures";

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

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/analyze", {
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

describe("POST /api/analyze — request validation", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns 400 when pitch is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/10 characters/i);
  });

  it("returns 400 when pitch is an empty string", async () => {
    const res = await POST(makeRequest({ pitch: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when pitch is shorter than 10 characters", async () => {
    const res = await POST(makeRequest({ pitch: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when pitch is a number, not a string", async () => {
    const res = await POST(makeRequest({ pitch: 42 }));
    expect(res.status).toBe(400);
  });

  it("accepts a pitch of exactly 10 characters", async () => {
    mockOpenAISuccess(VALID_ANALYSIS_JSON);
    const res = await POST(makeRequest({ pitch: "1234567890" }));
    expect(res.status).toBe(200);
  });
});

// ── successful response ───────────────────────────────────────────────────────

describe("POST /api/analyze — successful response", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns 200 with the parsed AnalysisResult", async () => {
    mockOpenAISuccess(VALID_ANALYSIS_JSON);
    const res = await POST(makeRequest({ pitch: "A SaaS dashboard for marketing teams" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.primaryCategory).toBe("Web");
    expect(data.complexity).toBe("Medium");
    expect(Array.isArray(data.suggestedTechStack)).toBe(true);
    expect(Array.isArray(data.dynamicQuestions)).toBe(true);
    expect(typeof data.visualRequirements).toBe("boolean");
  });

  it("passes the trimmed pitch to OpenAI", async () => {
    mockOpenAISuccess(VALID_ANALYSIS_JSON);
    await POST(makeRequest({ pitch: "  A SaaS dashboard for marketing teams  " }));
    const callArg = mockCreate.mock.calls[0][0];
    const userMessage = callArg.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("A SaaS dashboard for marketing teams");
    expect(userMessage).not.toMatch(/^\s/); // no leading whitespace inside quotes
  });

  it("sends a json_schema response_format to OpenAI", async () => {
    mockOpenAISuccess(VALID_ANALYSIS_JSON);
    await POST(makeRequest({ pitch: "A SaaS dashboard for marketing teams" }));
    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.response_format?.type).toBe("json_schema");
    expect(callArg.response_format?.json_schema?.strict).toBe(true);
  });
});

// ── error handling ────────────────────────────────────────────────────────────

describe("POST /api/analyze — error handling", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns 500 when OpenAI throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("OpenAI is down"));
    const res = await POST(makeRequest({ pitch: "A SaaS dashboard for marketing teams" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("OpenAI is down");
  });

  it("returns 500 with a user-friendly message when AI returns invalid schema", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ wrong: "shape" }) } }],
    });
    const res = await POST(makeRequest({ pitch: "A SaaS dashboard for marketing teams" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/unexpected format/i);
  });

  it("returns 500 with a user-friendly message when AI returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not-json{{" } }],
    });
    const res = await POST(makeRequest({ pitch: "A SaaS dashboard for marketing teams" }));
    expect(res.status).toBe(500);
  });

  it("handles null message content gracefully (falls back to empty object)", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });
    const res = await POST(makeRequest({ pitch: "A SaaS dashboard for marketing teams" }));
    // Zod will reject {} → 500 with unexpected format message
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/unexpected format/i);
  });
});
