import { blankSpec, templates, validateSpec, executeRules } from "../src/index";
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/templates") return Response.json(templates);
    if (request.method === "GET") return Response.json({ service: "Agent Builder Core", routes: ["GET /templates", "POST /validate", "POST /run"], example: { spec: blankSpec, input: "hello" } });
    if (request.method !== "POST" || !["/validate", "/run"].includes(url.pathname)) return new Response("Not found", { status: 404 });
    if (Number(request.headers.get("content-length")) > 100000) return new Response("Payload too large", { status: 413 });
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let text = "", size = 0;
    if (reader) while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 100000) { await reader.cancel(); return new Response("Payload too large", { status: 413 }); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    try {
      const body = JSON.parse(text);
      const spec = validateSpec(body.spec);
      if (url.pathname === "/validate") return Response.json({ spec });
      if (spec.engine !== "rules") return Response.json({ error: "This example executes rules only. Add a server-side Workers AI adapter to run model-backed agents." }, { status: 400 });
      if (typeof body.input !== "string" || body.input.length > 10000) return Response.json({ error: "Input must be a string of at most 10000 characters." }, { status: 400 });
      return Response.json(executeRules(spec, body.input));
    } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 }); }
  }
};
