import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/,"");

export async function POST(
  _req: Request,
  { params }: { params: { trackId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = `${BACKEND}/users/${userId}/favorites/${params.trackId}`;
  const r = await fetch(url, { method: "POST" });
  const body = await r.text();
  return new Response(body, { status: r.status, headers: { "Content-Type": "application/json" } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { trackId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = `${BACKEND}/users/${userId}/favorites/${params.trackId}`;
  const r = await fetch(url, { method: "DELETE" });
  const body = await r.text();
  return new Response(body, { status: r.status, headers: { "Content-Type": "application/json" } });
}
