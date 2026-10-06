# Agent Builder Core

**Reusable TypeScript building blocks extracted from Studio for defining, validating, and testing agents and linear workflows.**

[![Deploy To Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shawnbure/agent-builder-core)

This is the reusable builder core requested for open-source release. It contains agent specifications, templates, validators, deterministic rule execution, workflow/skill models, repository proposal validation, and model-catalog helpers. It can stay internal plumbing or be embedded in your own app.

The Cloudflare button deploys a small stateless demonstration API. The full Studio SaaS, accounts, billing, provider connections, OAuth vault, administration, code sandbox, and production infrastructure are outside this extraction.

## Included Components

| Module | Responsibilities |
| --- | --- |
| `src/agent-model.ts` | `AgentSpec`, records/releases/runs, templates, validation, rules execution, digest, OpenAPI helper |
| `src/workflow-model.ts` | Skills, flow steps/releases/runs, flow/skill validation, bounded literal template substitution |
| `src/repository-model.ts` | Repository names/paths, code settings, bounded code proposal parsing |
| `src/native-models.ts` | Model normalization, sorting, examples, default model identifier |
| `src/index.ts` | Public exports |
| `example/worker.ts` | Stateless validation/rules API on Workers |
| `src/*.test.ts` | Original component tests |

The definitions include `assistant` and `code` types, `rules` and `workers-ai` engines, approval flags, rate-limit settings, knowledge text, model options, and source/destination IDs. These are data contracts; the library does not enforce deployment authorization, schedule execution, execute repository commands, or deliver external outputs.

## Requirements And Local Setup

Node.js 22.14 or later, npm, and Git. Cloudflare is needed only to deploy the example.

```sh
git clone https://github.com/shawnbure/agent-builder-core.git
cd agent-builder-core
npm ci
npm run check
npm test
npm run dev
```

Wrangler prints the local API URL, normally port 8787. No database, account login, provider credential, or Workers AI binding is required for this rules-only example. It does not save requests or agent definitions.

## Use The Core In Your App

Copy `src/` into a TypeScript project or use this repository as a local dependency. It exports TypeScript source and expects a bundler such as Vite/esbuild; it is not a precompiled npm distribution. The root package is marked `private` to prevent accidental npm publication, independently of the GitHub repository's public visibility.

```ts
import { blankSpec, validateSpec, executeRules } from "./src/index";

const agent = validateSpec({
  ...blankSpec,
  name: "Community Helper",
  rules: [{ keyword: "hours", response: "Open 09:00–17:00." }],
  fallback: "Please contact the operator for that question.",
});
const result = executeRules(agent, "What are your hours?");
```

Validation sanitizes supported fields and rejects invalid policies and oversized input/context. Rule matching is case insensitive and follows declared rule order; unmatched requests use the configured fallback. Literal workflow template substitution treats input as data and does not evaluate JavaScript.

Use `validateFlow` before saving a flow and `validateSkill` before saving a skill. Flow definitions reference existing agent/skill IDs: your application must resolve those IDs and check permissions. An `approval` step is a definition, not an implemented approval service.

Repository code settings and proposal parsing do not grant repository access or safely execute commands. If you add execution, require authorization, isolate execution, bound budgets/time, validate file paths, and test the proposed changes. The example never executes code proposals.

## Deploy The Demo To Cloudflare

Click the button, fork into your own account, choose a Worker name, and accept build command `npm run build` and deployment command `npm run deploy`. The root config points to `example/worker.ts`; there are no persistent bindings or secrets.

Manual deployment:

```sh
npx wrangler login
npm run check
npm test
npm run deploy
```

Visit the returned Worker URL. The demo exposes:

| Method And Path | Result |
| --- | --- |
| `GET /` | Service information, supported routes, sample payload |
| `GET /templates` | Shipped agent templates |
| `POST /validate` | Validated specification from `{ "spec": ... }` |
| `POST /run` | Rule output from `{ "spec": ..., "input": "..." }` |

The demonstration is public and stateless. Invalid payloads return 400, unknown routes/methods return 404, and oversized payloads return 413. The sample bounds request text to 100 KB and run input to 10,000 characters; add edge rate limits and authenticated storage before turning it into a hosted builder service. It accepts only the `rules` engine for execution. It does not expose any secret or privileged action.

## Add Workers AI To Your Own Application

Add an `AI` binding in your own Wrangler configuration and a server-side inference adapter. Call `validateSpec` first, select a model supported by your account, and pass only an explicitly approved input shape to `env.AI.run`. Do not send a full arbitrary model-options object directly to inference without model-specific validation. The model helpers describe catalog data; they do not guarantee an identifier is currently available or compatible with your input.

For persistence, add D1 or a Durable Object and store definitions/releases under authenticated owner IDs. For durable jobs, add an appropriate coordinator and idempotency keys. Keep approval transitions and delivery retries in your own runtime. See [Workers AI](https://developers.cloudflare.com/workers-ai/) and [Durable Objects](https://developers.cloudflare.com/durable-objects/).

## Extending A Builder UI

Use `blankSpec` as editable state, `templates` for starting choices, and `validateSpec` at both client and server boundaries. Keep validation errors near the affected field. Save draft and release records separately so a saved edit does not silently alter an active release. A UI should make approval requirements and result destinations explicit before publication. The library does not include the original Studio React screens or a visual canvas.

## Verification And Limitations

```sh
npm run check
npm test
npx wrangler deploy --dry-run
```

Tests cover shipped templates, input bounds, independent sanitized rules, deterministic matching, flow/skill validation, repository proposals, and model normalization. The build command checks types; Wrangler bundles the example at deployment.

This extraction does not include an autonomous tool loop, durable scheduler, credential vault, provider integrations, PDF parsing, retrieval index, or production capacity claim. `digest` is a SHA-256 helper and should not be used alone to hash human passwords. Treat definitions and request content as untrusted data.

## License

[GNU AGPL v3](LICENSE). Follow the license when embedding modified code in a network service. The extraction contains no Studio account database, provider credential, local login, or platform setup token.

## Secrets And Public Source

No operator passwords, API credentials, login cookies, private keys, local databases, or deployment secret files are distributed. `.dev.vars`, `.env`, `.wrangler`, and local data are ignored. Example files contain names and empty placeholders only. Create fresh secrets in your own account; never copy credentials from the original hosted service. Cloudflare account IDs and resource IDs are configuration identifiers, not API credentials, but the public templates use placeholders so your instance does not target the author's resources.

Keep secrets in Wrangler secrets or your deployment provider's secret store. Do not put them in frontend `VITE_*` values, public posts, issues, screenshots, or command arguments. A frontend variable is compiled into public JavaScript. If you accidentally commit a credential, revoke/rotate it before considering Git history cleanup. Changing a repository to public exposes its branches, tags, and commit history as well as its current files.

## Operating Your Instance

Use separate resources for development and production. Review Cloudflare billing and service limits for the features you enable; this repository does not promise a zero-cost deployment. Enable logs, monitor failed requests, and configure your own custom domain after the default deployment works. Back up persistent storage and test recovery before relying on the service. A Worker rollback does not roll back D1 data or Durable Object state. Read migrations before applying them to an existing database.

For upgrades: back up your database, pull a reviewed release, install from the lockfile, run the documented checks, apply migrations where applicable, then deploy. Keep encryption keys stable unless you also migrate the encrypted records. If you use an API token for CI, scope it to your own account and required resources and save it as a CI secret.

## Contributing

Start with the local setup and existing tests. Keep pull requests focused, describe user-visible behavior and verification, and include migration or deployment notes when those change. Do not add generated databases, private customer information, provider secrets, build output, or unrelated marketing material. Dependency upgrades should include lockfile changes and compatibility checks. This project accepts community contributions without promising a managed service, support response time, or product roadmap.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Report vulnerabilities privately through GitHub's private vulnerability reporting when enabled; public issues should omit exploit credentials and personal data.

## Cloudflare References

- [Deploy to Cloudflare button setup and supported resources](https://developers.cloudflare.com/workers/platform/deploy-buttons/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

A build or deployment dry run validates packaging; it does not validate a real account's permissions, provisioned resources, custom domain, email delivery, or external provider connections. The button uses Cloudflare's own cloning and deployment flow; review its build/deploy fields and complete the checks below after deployment.
