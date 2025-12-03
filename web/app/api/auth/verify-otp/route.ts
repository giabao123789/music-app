import 'server-only';

const BACKEND = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await fetch(`${BACKEND}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  return new Response(txt, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' } });
}
