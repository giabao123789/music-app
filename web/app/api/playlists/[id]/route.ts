import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return Response.json({ id: params.id, name: "Playlist", tracks: [] }, { status: 200 });

  const url = `${BACKEND}/playlists/${params.id}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store" });
  return Response.json(await r.json().catch(() => ({ id: params.id, name: "Playlist", tracks: [] })), { status: r.status });
}
