import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.user?.id) return Response.json([], { status: 200 });

  const url = `${BACKEND}/users/${session.user.id}/playlists`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store" });
  return Response.json(await r.json().catch(() => []), { status: r.status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = `${BACKEND}/users/${session.user.id}/playlists`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify(body),
  });
  return Response.json(await r.json().catch(() => ({})), { status: r.status });
}
