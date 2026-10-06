export type ProjectTeam = { id: string; repository: string; createdAt: string; connectionId?: string; workflowId?: string; scheduleId?: string; mode?: "review"; coding?: boolean; members: { role: string; agentId: string }[] };
import { validateCodeSettings, type CodeSettings, type CodeProposal } from "./repository-model";
export type AgentSpec = {
  type?: "assistant" | "code";
  code?: CodeSettings;
  name: string;
  description: string;
  instructions: string;
  engine: "rules" | "workers-ai";
  knowledge: string;
  rules: { keyword: string; response: string }[];
  fallback: string;
  requireApproval: boolean;
  rateLimit: number;
  model?: string;
  outputFormat?: "text" | "json";
  modelInputMode?: "text" | "json";
  modelOptions?: Record<string, string | number | boolean | null>;
  sourceIds?: string[];
  destinationIds?: string[];
};
export type Release = { version: number; spec: AgentSpec; createdAt: string };
export type AgentRecord = {
  id: string;
  draft: AgentSpec;
  releases: Release[];
  activeVersion: number | null;
  updatedAt: string;
};
export type Trace = {
  name: string;
  detail: string;
  durationMs: number;
  at: string;
};
export type AgentRun = {
  coding?: boolean;
  code?: CodeProposal;
  id: string;
  agentId: string;
  agentName: string;
  version: number | "draft";
  source: "console" | "api" | "evaluation" | "schedule";
  input: string;
  output: string;
  status:
    "queued" | "running" | "completed" | "waiting" | "rejected" | "failed";
  startedAt: string;
  durationMs: number;
  traces: Trace[];
  error?: string;
  tokens?: number;
};
export type ApiKey = {
  id: string;
  name: string;
  agentId: string;
  prefix: string;
  hash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};
export type Evaluation = {
  id: string;
  agentId: string;
  createdAt: string;
  spec: AgentSpec;
  results: {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    runId: string;
  }[];
};
export type AuditEvent = {
  id: string;
  action: string;
  detail: string;
  at: string;
};
export type StudioState = {
  projectTeams?: ProjectTeam[];
  agents: AgentRecord[];
  runs: AgentRun[];
  keys: ApiKey[];
  evaluations: Evaluation[];
  audit: AuditEvent[];
  limits: Record<string, { minute: number; count: number }>;
};
export type StudioSnapshot = Omit<StudioState, "keys" | "limits"> & {
  keys: Omit<ApiKey, "hash">[];
  workspaceId: string;
  environment: string;
};
export const blankSpec: AgentSpec = {
  name: "Untitled Agent",
  description: "",
  instructions:
    "You are a helpful assistant. Use the provided knowledge to answer accurately. If the answer is unknown, say so.",
  engine: "rules",
  knowledge: "",
  rules: [],
  fallback: "Thanks for your message. A team member will follow up.",
  requireApproval: false,
  rateLimit: 60,
};
export const templates: {
  title: string;
  description: string;
  spec: AgentSpec;
  input: string;
}[] = [
  {
    title: "Support Triage",
    description: "Route incoming requests and answer common questions.",
    input: "How do I request a refund?",
    spec: {
      ...blankSpec,
      name: "Support Triage",
      description:
        "Turn customer questions into consistent, actionable answers.",
      knowledge:
        "Refunds are available within 30 days. For account access, use the password reset link.",
      rules: [
        {
          keyword: "refund",
          response:
            "You can request a refund within 30 days of purchase. Share your order number with our support team.",
        },
        {
          keyword: "password",
          response:
            "Use the password reset link on the sign-in page to regain access to your account.",
        },
      ],
    },
  },
  {
    title: "Document Reviewer",
    description: "Review documents against your own instructions.",
    input: "Review this agreement: payment is due within 90 days.",
    spec: {
      ...blankSpec,
      name: "Document Reviewer",
      description:
        "Review pasted documents and flag risks against your policy.",
      engine: "workers-ai",
      instructions:
        "Review the document against the supplied policy. Return a concise summary, risks, and recommended next steps. Cite the relevant document text. Do not invent facts.",
      knowledge:
        "Our standard payment terms are net 30. Flag payment terms longer than 30 days.",
      requireApproval: true,
    },
  },
  {
    title: "Custom Assistant",
    description: "Start with your own instructions and knowledge.",
    input: "What can you help me with?",
    spec: { ...blankSpec, name: "Custom Assistant", engine: "workers-ai" },
  },
];
export function validateSpec(value: unknown): AgentSpec {
  if (!value || typeof value !== "object")
    throw new Error("Agent configuration is required.");
  const s = value as AgentSpec;
  if (s.type !== undefined && !["assistant", "code"].includes(s.type)) throw Error("Choose a valid agent type.");
  const code = s.type === "code" ? validateCodeSettings(s.code) : undefined;
  if (code && (s.engine !== "workers-ai" || s.modelInputMode === "json")) throw Error("Code agents require a Workers AI text model.");
  for (const [key, max] of [
    ["name", 80],
    ["description", 500],
    ["instructions", 12000],
    ["knowledge", 20000],
    ["fallback", 4000],
  ] as const) {
    if (typeof s[key] !== "string" || s[key].length > max)
      throw new Error(`Invalid ${key} (maximum ${max} characters).`);
  }
  if (!s.name.trim() || !s.instructions.trim())
    throw new Error("Name and instructions are required.");
  if (!["rules", "workers-ai"].includes(s.engine))
    throw new Error("Unsupported execution engine.");
  if (
    typeof s.requireApproval !== "boolean" ||
    !Number.isInteger(s.rateLimit) ||
    s.rateLimit < 1 ||
    s.rateLimit > 600
  )
    throw new Error(
      "Rate limit must be between 1 and 600 requests per minute.",
    );
  if (
    !Array.isArray(s.rules) ||
    s.rules.length > 50 ||
    s.rules.some(
      (r) =>
        !r ||
        typeof r.keyword !== "string" ||
        !r.keyword.trim() ||
        r.keyword.length > 200 ||
        typeof r.response !== "string" ||
        !r.response.trim() ||
        r.response.length > 4000,
    )
  )
    throw new Error(
      "Each rule needs a keyword and response; maximum 50 rules.",
    );
  if (
    s.model !== undefined &&
    (typeof s.model !== "string" ||
      !/^@(cf|hf)\/[a-zA-Z0-9._/-]{1,160}$/.test(s.model))
  )
    throw new Error("Choose a native Cloudflare model.");
  if (
    s.modelInputMode !== undefined &&
    !["text", "json"].includes(s.modelInputMode)
  )
    throw new Error("Invalid model input mode.");
  if (
    s.modelOptions !== undefined &&
    (!s.modelOptions ||
      typeof s.modelOptions !== "object" ||
      Array.isArray(s.modelOptions) ||
      JSON.stringify(s.modelOptions).length > 12000 ||
      Object.values(s.modelOptions).some(
        (v) =>
          v !== null && !["string", "number", "boolean"].includes(typeof v),
      ))
  )
    throw new Error("Model settings must be a JSON object smaller than 12 KB.");
  for (const ids of [s.sourceIds, s.destinationIds]) {
    if (
      ids !== undefined &&
      (!Array.isArray(ids) ||
        ids.length > 4 ||
        ids.some((id) => typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)))
    )
      throw new Error("Choose at most four valid connections per direction.");
  }
  if (s.outputFormat !== undefined && !["text", "json"].includes(s.outputFormat)) throw Error("Choose text or JSON output.");
  return {
    type: s.type ?? "assistant",
    ...(code ? { code } : {}),
    ...(s.outputFormat ? { outputFormat: s.outputFormat } : {}),
    ...(s.model ? { model: s.model } : {}),
    ...(s.modelInputMode ? { modelInputMode: s.modelInputMode } : {}),
    ...(s.modelOptions ? { modelOptions: s.modelOptions } : {}),
    ...(s.sourceIds ? { sourceIds: [...new Set(s.sourceIds)] } : {}),
    ...(s.destinationIds
      ? { destinationIds: [...new Set(s.destinationIds)] }
      : {}),
    name: s.name.trim(),
    description: s.description,
    instructions: s.instructions,
    engine: s.engine,
    knowledge: s.knowledge,
    rules: s.rules.map((r) => ({
      keyword: r.keyword.trim(),
      response: r.response,
    })),
    fallback: s.fallback,
    requireApproval: code ? true : s.requireApproval,
    rateLimit: s.rateLimit,
  };
}
export function executeRules(spec: AgentSpec, input: string) {
  const match = spec.rules.find((r) =>
    input.toLowerCase().includes(r.keyword.toLowerCase()),
  );
  return {
    output: match?.response ?? spec.fallback,
    detail: match
      ? `Matched keyword: ${match.keyword}`
      : "No rule matched; returned configured fallback.",
  };
}
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

export function openApiDocument(endpoint: string, agent: AgentRecord) {
  const url = new URL(endpoint);
  const runSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      status: {
        type: "string",
        enum: [
          "queued",
          "running",
          "completed",
          "waiting",
          "rejected",
          "failed",
        ],
      },
      output: { type: "string" },
      durationMs: { type: "integer" },
      version: { type: "integer" },
    },
  };
  const response = (description: string) => ({
    description,
    content: { "application/json": { schema: runSchema } },
  });
  return {
    openapi: "3.1.0",
    info: {
      title: `${agent.draft.name} API`,
      version: String(agent.activeVersion ?? 1),
      description:
        "Invoke a published Workrr agent and poll approval-gated results.",
    },
    servers: [{ url: url.origin }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    },
    paths: {
      [url.pathname]: {
        post: {
          operationId: "invokeAgent",
          summary: "Run the published agent",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["input"],
                  properties: {
                    input: { type: "string", minLength: 1, maxLength: 16000 },
                    async: {
                      type: "boolean",
                      description:
                        "Queue durable execution; poll the returned run ID.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": response("Completed execution"),
            "202": response("Waiting for approval; output is withheld"),
            "400": { description: "Invalid request" },
            "401": { description: "Invalid API key" },
            "409": { description: "Endpoint paused or unpublished" },
            "429": { description: "Rate limit exceeded" },
            "502": response("Execution failed"),
          },
        },
      },
      [`${url.pathname}/{runId}`]: {
        get: {
          operationId: "getAgentRun",
          summary: "Read run status and approved output",
          parameters: [
            {
              name: "runId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": response("Run status; output returned only when completed"),
            "401": { description: "Invalid API key" },
            "404": { description: "Run not found" },
            "409": { description: "Endpoint paused or unpublished" },
          },
        },
      },
    },
  };
}
