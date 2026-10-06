export type RepositoryProvider = "github" | "gitlab";
export type CodeSettings = { connectionId: string; baseBranch: string; contextFiles: string[]; testCommand: string; setupCommand: string; taskSource?: "input" | "issues"; issueLabel?: string; submission?: "approval" | "draft"; maxSteps?: number; maxAttempts?: number; maxMinutes?: number; maxAiCostMicro?: number };
export type CodeChange = { path: string; content: string | null; before: string | null };
export type CodeProposal = { connectionId: string; provider: RepositoryProvider; repository: string; baseBranch: string; baseSha: string; title: string; summary: string; changes: CodeChange[]; checks: { command: string; exitCode: number; output: string }[]; submissionUrl?: string };
export function repositoryPath(value: string) {
  if (!value || value.length > 240 || value.startsWith('/') || value.includes('\\') || value.split('/').some(p => !p || p === '.' || p === '..' || p.toLowerCase() === '.git') || /[\x00-\x1f\x7f]/.test(value)) throw Error('Use a relative repository file path without traversal or .git entries.');
  return value;
}
export function repositoryName(value: string, provider: RepositoryProvider) {
  const parts=value.split('/');
  if (value.length > 200 || parts.length < 2 || (provider === 'github' && parts.length !== 2) || parts.some(p=>! /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(p) || p.endsWith('.git') || p === '..')) throw Error('Enter the repository as owner/name (GitLab groups may contain subgroups).');
  return value;
}
export function validateCodeSettings(raw: unknown): CodeSettings {
  const c=raw as CodeSettings;
  if (!c || typeof c.connectionId !== 'string' || !/^[a-f0-9-]{36}$/.test(c.connectionId)) throw Error('Choose a GitHub or GitLab repository connection.');
  if (typeof c.baseBranch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,149}$/.test(c.baseBranch) || c.baseBranch.includes('..') || c.baseBranch.endsWith('/')) throw Error('Enter a valid base branch.');
  if (!Array.isArray(c.contextFiles) || c.contextFiles.length < 1 || c.contextFiles.length > 8 || c.contextFiles.some(p=>typeof p !== 'string')) throw Error('Choose 1–8 context files for the agent.');
  for (const p of c.contextFiles) repositoryPath(p);
  for (const key of ['testCommand','setupCommand'] as const) if (typeof c[key] !== 'string' || c[key].length > 1000 || c[key].includes('\0')) throw Error('Commands must contain at most 1,000 characters.');
  if (!c.testCommand.trim()) throw Error('Enter a test or validation command.');
  if(c.taskSource!==undefined && !["input","issues"].includes(c.taskSource))throw Error("Choose a valid task source.");
  if(c.taskSource==="issues" && (typeof c.issueLabel!=="string" || !/^[A-Za-z0-9 _:-]{1,80}$/.test(c.issueLabel)))throw Error("Enter an issue label (1–80 letters, numbers, spaces, colons, underscores or dashes).");
  const limits = {maxSteps:c.maxSteps ?? 10,maxAttempts:c.maxAttempts ?? 3,maxMinutes:c.maxMinutes ?? 20,maxAiCostMicro:c.maxAiCostMicro ?? 1000000};
  for (const [key,min,max] of [["maxSteps",2,30],["maxAttempts",1,8],["maxMinutes",1,60],["maxAiCostMicro",10000,100000000]] as const) if (!Number.isSafeInteger(limits[key]) || limits[key]<min || limits[key]>max) throw Error(`Invalid code execution limit: ${key}.`);
  if(c.submission !== undefined && !["approval","draft"].includes(c.submission)) throw Error("Choose approval or automatic draft submission.");
  return {...limits,taskSource:c.taskSource??"input",issueLabel:c.issueLabel??"workrr",submission:c.submission ?? "approval",connectionId:c.connectionId,baseBranch:c.baseBranch,contextFiles:[...new Set(c.contextFiles)],testCommand:c.testCommand.trim(),setupCommand:c.setupCommand.trim()};
}
export function parseCodePatch(output:string): {title:string;summary:string;files:{path:string;content:string|null}[]} {
  const text=output.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  let p: ReturnType<typeof parseCodePatch>;
  try { p=JSON.parse(text); } catch { throw Error('The model did not return a valid JSON patch. Try a different coding model or a smaller task.'); }
  if (!p || typeof p.title !== 'string' || !p.title.trim() || p.title.length > 120 || typeof p.summary !== 'string' || p.summary.length > 4000 || !Array.isArray(p.files) || !p.files.length || p.files.length > 12) throw Error('The model must propose 1–12 files, a title, and a summary.');
  const paths=new Set<string>(); let total=0;
  for(const f of p.files) {
    repositoryPath(f.path);
    if (paths.has(f.path) || (f.content !== null && typeof f.content !== 'string')) throw Error('The patch contains duplicate files or invalid content.');
    paths.add(f.path); total+=(f.content?.length ?? 0);
  }
  if(total > 80000) throw Error('The proposed patch exceeds 80,000 characters. Split the task into smaller changes.');
  return {title:p.title, summary:p.summary,files:p.files};
}
