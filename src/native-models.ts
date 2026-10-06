export const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export type NativeModel = {
  name: string;
  description: string;
  type: string;
  addedAt: string | null;
  releasedAt: string | null;
  dateKind: "release" | "added" | "unknown";
  date: string | null;
  schema: Record<string, unknown> | null;
  tags: string[];
  realtime: boolean;
  contextWindow?: number;
};
export type NativeCatalog = {
  models: NativeModel[];
  fetchedAt: string;
  source: "live" | "snapshot";
  warning?: string;
};
export function normalizeModels(rows: unknown[]): NativeModel[] {
  return rows
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const m = raw as Record<string, unknown>;
      if (
        typeof m.name !== "string" ||
        !/^@(cf|hf)\//.test(m.name) ||
        m.source !== 1
      )
        return [];
      const props = Array.isArray(m.properties)
        ? (m.properties as { property_id: string; value: unknown }[])
        : [];
      const value = (key: string) =>
        props.find((p) => p.property_id === key)?.value;
      const date = (v: unknown) =>
        typeof v === "string" &&
        Number.isFinite(
          Date.parse(
            v.replace(" ", "T") + (/Z$|[+-]\d\d:\d\d$/.test(v) ? "" : "Z"),
          ),
        )
          ? new Date(
              v.replace(" ", "T") + (/Z$|[+-]\d\d:\d\d$/.test(v) ? "" : "Z"),
            ).toISOString()
          : null;
      const releasedAt = date(value("release_date")),
        addedAt = date(m.created_at);
      const task = m.task as { name?: string } | undefined;
      const type =
        task?.name === "Dumb Pipe"
          ? "Audio Turn Detection"
          : (task?.name ?? "Other");
      return [
        {
          name: m.name,
          description: typeof m.description === "string" ? m.description : "",
          type,
          addedAt,
          releasedAt,
          date: releasedAt ?? addedAt,
          dateKind: releasedAt ? "release" : addedAt ? "added" : "unknown",
          schema:
            m.schema && typeof m.schema === "object"
              ? (m.schema as Record<string, unknown>)
              : null,
          tags: Array.isArray(m.tags)
            ? m.tags.filter((x): x is string => typeof x === "string")
            : [],
          realtime: value("realtime") === "true",
          contextWindow: Number(value("context_window")) > 0 ? Number(value("context_window")) : undefined,
        } satisfies NativeModel,
      ];
    })
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        (b.date ?? "").localeCompare(a.date ?? "") ||
        a.name.localeCompare(b.name),
    );
}
export const modelSortOptions = [
  { value: "added-newest", label: "Date Added: Newest First" },
  { value: "added-oldest", label: "Date Added: Oldest First" },
  { value: "type", label: "Type, Then Newest" },
  { value: "name", label: "Name: A–Z" },
] as const;
export type ModelSort = typeof modelSortOptions[number]["value"];
export function sortModels(models: NativeModel[], sort: ModelSort): NativeModel[] {
  const byAdded = (a: NativeModel, b: NativeModel) => {
    if (!a.addedAt || !b.addedAt) return a.addedAt ? -1 : b.addedAt ? 1 : 0;
    return sort === "added-oldest" ? a.addedAt.localeCompare(b.addedAt) : b.addedAt.localeCompare(a.addedAt);
  };
  return [...models].sort((a, b) =>
    (sort === "name" ? 0 : sort === "type" ? a.type.localeCompare(b.type) || byAdded(a, b) : byAdded(a, b)) ||
    a.name.split("/").slice(2).join("/").localeCompare(b.name.split("/").slice(2).join("/")) || a.name.localeCompare(b.name)
  );
}
export function modelExample(model: NativeModel): Record<string, unknown> {
  const type = model.type;
  if (type === "Text Generation")
    return { messages: [{ role: "user", content: "Hello!" }], max_tokens: 512 };
  if (type === "Translation")
    return { text: "Hello world", source_lang: "en", target_lang: "es" };
  if (type === "Text Embeddings" || type === "Text Classification")
    return model.name.includes("reranker")
      ? {
          query: "Cloudflare",
          contexts: [{ text: "Cloudflare runs applications." }],
        }
      : { text: "Hello world" };
  if (type === "Text-to-Image")
    return { prompt: "A friendly green character on a cream background" };
  if (type === "Text-to-Speech")
    return model.name.includes("melotts") ? { prompt: "Hello from your Workrr agent.", lang: "en" } : { text: "Hello from your Workrr agent." };
  if (type === "Image-to-Text")
    return {
      image: { $asset: "UPLOAD_ID" },
      prompt: "Describe this image.",
      question: "Describe this image.",
    };
  if (type === "Image Classification")
    return { image: { $asset: "UPLOAD_ID" } };
  return { audio: { $asset: "UPLOAD_ID" } };
}
