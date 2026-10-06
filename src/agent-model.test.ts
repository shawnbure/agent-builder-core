import { describe, expect, it } from "vitest";
import {
  blankSpec,
  digest,
  executeRules,
  templates,
  validateSpec,
} from "./agent-model";
describe("agent configuration and execution", () => {
  it("validates every shipped template", () => {
    for (const t of templates) expect(validateSpec(t.spec).name).toBe(t.title);
  });
  it("rejects malformed policy and oversized context", () => {
    for (const patch of [
      { rateLimit: 0 },
      { rateLimit: 601 },
      { rateLimit: 1.5 },
      { requireApproval: "yes" },
      { engine: "unknown" },
      { name: "" },
      { knowledge: "a".repeat(20001) },
      { rules: [{ keyword: "", response: "no" }] },
    ])
      expect(() => validateSpec({ ...blankSpec, ...patch })).toThrow();
  });
  it("matches keywords case insensitively, preserves ordering, and falls back", () => {
    const spec = {
      ...blankSpec,
      rules: [
        { keyword: "REFUND", response: "first" },
        { keyword: "refund", response: "second" },
      ],
    };
    expect(executeRules(spec, "request a refund").output).toBe("first");
    expect(executeRules(spec, "unrelated").output).toBe(spec.fallback);
  });
  it("stores independent sanitized rules", () => {
    const raw = {
      ...blankSpec,
      rules: [{ keyword: " a ", response: "answer" }],
    };
    const validated = validateSpec(raw);
    raw.rules[0]!.response = "changed";
    expect(validated.rules[0]).toEqual({ keyword: "a", response: "answer" });
  });
  it("hashes secrets deterministically without retaining plaintext", async () => {
    const hash = await digest("secret");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(await digest("secret"));
    expect(hash).not.toBe(await digest("different"));
  });
});
