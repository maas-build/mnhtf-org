interface ContactPayload {
  name: string;
  email: string;
  intent: string;
  message: string;
  'cf-turnstile-response': string;
}

export async function handleContact(request: Request, env: Env): Promise<Response> {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json() as ContactPayload;
    const { name, email, intent, message } = body;
    const token = body['cf-turnstile-response'];

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), { status: 400, headers });
    }

    if (env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SECRET_KEY !== 'skip') {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
      });
      const verify = await verifyRes.json() as { success: boolean };
      if (!verify.success) {
        return new Response(JSON.stringify({ ok: false, error: 'CAPTCHA verification failed' }), { status: 403, headers });
      }
    }

    const emailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'info@mnhtf.org', name: 'MN HTF' }] }],
        from: { email: 'noreply@mnhtf.org', name: 'MNHTF Website' },
        reply_to: { email, name },
        subject: `Website Contact: ${intent || 'General Inquiry'}`,
        content: [{
          type: 'text/plain',
          value: `Name: ${name}\nEmail: ${email}\nIntent: ${intent}\n\nMessage:\n${message}`,
        }],
      }),
    });

    if (!emailRes.ok && emailRes.status !== 202) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to send email' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (_err) {
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), { status: 500, headers });
  }
}
