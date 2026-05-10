import { describe, expect, it, vi } from 'vitest';
import { handleContact } from './contact-form';

const mockEnv: Env = {
  ASSETS: {} as Fetcher,
  TURNSTILE_SECRET_KEY: 'skip',
  TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
};

describe('handleContact', () => {
  it('returns 400 when required fields are missing', async () => {
    const request = new Request('https://mnhtf.org/api/contact', {
      method: 'POST',
      body: JSON.stringify({ name: '', email: '', message: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await handleContact(request, mockEnv);
    expect(res.status).toBe(400);
  });

  it('sends email and returns 200 on valid input', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
    const request = new Request('https://mnhtf.org/api/contact', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com', intent: 'General', message: 'Hello' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await handleContact(request, mockEnv);
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});
