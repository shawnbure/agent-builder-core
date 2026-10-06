import type { AgentSpec } from "./agent-model";
export type Skill = {
  id: string;
  name: string;
  description: string;
  kind: "prompt" | "template" | "read" | "write" | "api" | "send";
  instructions: string;
  connectionId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  updatedAt: string;
};
export type FlowStep = {
  id: string;
  kind: "agent" | "skill" | "approval" | "filter" | "delay";
  ref: string;
  value: string;
};
export type FlowSpec = { name: string; description: string; steps: FlowStep[] };
export type FlowRelease = {
  version: number;
  spec: FlowSpec;
  skills: Skill[];
  createdAt: string;
};
export type Flow = {
  id: string;
  draft: FlowSpec;
  releases: FlowRelease[];
  activeVersion: number | null;
  updatedAt: string;
  keyPrefix?: string;
};
export type FlowLog = {
  stepId: string;
  name: string;
  status: string;
  output: string;
  at: string;
  durationMs: number;
};
export type FlowRun = {
  id: string;
  workflowId: string;
  name: string;
  version: number;
  status:
    | "queued"
    | "running"
    | "waiting"
    | "completed"
    | "failed"
    | "filtered"
    | "cancelled";
  input: string;
  output: string;
  logs: FlowLog[];
  startedAt: string;
  error?: string;
  approvalRunId?: string;
  attentionReviewed?: { at: string; by: string };
};
export type FlowJob = {
  workspace: string;
  run: FlowRun;
  spec: FlowSpec;
  skills: Skill[];
  agents: Record<string, { spec: AgentSpec; version: number }>;
};
export function validateSkill(raw: unknown): Omit<Skill, "id" | "updatedAt"> {
  const s = raw as Skill;
  if (
    !s ||
    typeof s.name !== "string" ||
    !s.name.trim() ||
    s.name.length > 80 ||
    typeof s.description !== "string" ||
    s.description.length > 500 ||
    !["prompt", "template", "read", "write", "api", "send"].includes(s.kind) ||
    typeof s.instructions !== "string" ||
    s.instructions.length > 12000 ||
    typeof s.connectionId !== "string" ||
    typeof s.path !== "string" ||
    s.path.length > 1000 ||
    !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(s.method)
  )
    throw new Error("Provide a valid skill name, action, and settings.");
  if (["prompt", "template"].includes(s.kind) && !s.instructions.trim())
    throw new Error("Instructions are required.");
  if (
    ["read", "write", "api", "send"].includes(s.kind) &&
    !/^[a-f0-9-]{36}$/.test(s.connectionId)
  )
    throw new Error("Choose a connection.");
  return {
    name: s.name.trim(),
    description: s.description,
    kind: s.kind,
    instructions: s.instructions,
    connectionId: s.connectionId,
    path: s.path,
    method: s.method,
  };
}
export function validateFlow(raw: unknown): FlowSpec {
  const s = raw as FlowSpec;
  if (
    !s ||
    typeof s.name !== "string" ||
    !s.name.trim() ||
    s.name.length > 80 ||
    typeof s.description !== "string" ||
    s.description.length > 500 ||
    !Array.isArray(s.steps) ||
    s.steps.length < 1 ||
    s.steps.length > 20
  )
    throw new Error("Give the workflow a name and 1–20 steps.");
  const ids = new Set<string>();
  for (const step of s.steps) {
    if (
      !step ||
      typeof step.id !== "string" ||
      !/^[a-f0-9-]{36}$/.test(step.id) ||
      ids.has(step.id) ||
      !["agent", "skill", "approval", "filter", "delay"].includes(step.kind) ||
      typeof step.ref !== "string" ||
      typeof step.value !== "string" ||
      step.value.length > 4000
    )
      throw new Error("Invalid workflow step.");
    ids.add(step.id);
    if (
      ["agent", "skill"].includes(step.kind) &&
      !/^[a-f0-9-]{36}$/.test(step.ref)
    )
      throw new Error("Choose an agent or skill for each step.");
    if (
      step.kind === "delay" &&
      (!Number.isInteger(Number(step.value)) ||
        Number(step.value) < 1 ||
        Number(step.value) > 86400)
    )
      throw new Error("Delay must be 1–86,400 seconds.");
    if (step.kind === "filter" && !step.value.trim())
      throw new Error("Filter text is required.");
  }
  return {
    name: s.name.trim(),
    description: s.description,
    steps: s.steps.map((x) => ({
      id: x.id,
      kind: x.kind,
      ref: x.ref,
      value: x.value,
    })),
  };
}
export function applyTemplate(template: string, input: string) {
  const result = template.replaceAll("{{input}}", input);
  if (result.length > 16000)
    throw new Error("Step output exceeds 16,000 characters.");
  return result;
}
