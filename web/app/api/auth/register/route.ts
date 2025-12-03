// web/app/api/auth/register/route.ts
import "server-only";

const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // body: { email, password, name?, role?: "USER" | "ARTIST" }
    const r = await fetch(`${BACKEND}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const txt = await r.text();
    return new Response(txt, {
      status: r.status,
      headers: { "Content-Type": r.headers.get("content-type") || "application/json" },
    });
  } catch (e: any) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
