import { describe, it, expect } from 'vitest';
import worker from './worker';
import { blankSpec } from '../src/index';
describe('stateless Cloudflare example', () => {
  const post = (path: string, body: unknown) => worker.fetch(new Request(`https://example.org${path}`, { method: 'POST', body: JSON.stringify(body) }));
  it('serves discovery and rejects unknown routes', async () => {
    expect((await worker.fetch(new Request('https://example.org/'))).status).toBe(200);
    expect((await worker.fetch(new Request('https://example.org/unknown'))).status).toBe(404);
  });
  it('validates and runs a deterministic rules agent', async () => {
    const response = await post('/run', { spec: { ...blankSpec, rules: [{ keyword: 'hours', response: 'Open daily.' }] }, input: 'What are your hours?' });
    expect(response.status).toBe(200);
    expect((await response.json()).output).toBe('Open daily.');
  });
  it('rejects model execution and invalid requests', async () => {
    expect((await post('/run', { spec: { ...blankSpec, engine: 'workers-ai' }, input: 'hi' })).status).toBe(400);
    expect((await post('/validate', { spec: {} })).status).toBe(400);
  });
  it('rejects an oversized streaming body even without Content-Length', async () => {
    const response = await worker.fetch(new Request('https://example.org/run', { method: 'POST', body: 'x'.repeat(100001) }));
    expect(response.status).toBe(413);
  });
});
