import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

export async function POST(_: Request, { params }: { params: { id: string; trackId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = `${BACKEND}/playlists/${params.id}/tracks`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify({ trackId: params.trackId }),
  });
  return Response.json(await r.json().catch(() => ({})), { status: r.status });
}

export async function DELETE(_: Request, { params }: { params: { id: string; trackId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = `${BACKEND}/playlists/${params.id}/tracks/${params.trackId}`;
  const r = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${session.accessToken}` } });
  return Response.json(await r.json().catch(() => ({})), { status: r.status });
}
