import "server-only";

const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

// POST /api/playlists/:id/tracks  body: { trackId }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { trackId } = await req.json().catch(() => ({}));
  if (!trackId) return Response.json({ error: "trackId is required" }, { status: 400 });

  const r = await fetch(`${BACKEND}/playlists/${params.id}/tracks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trackId }),
  });

  const text = await r.text();
  return new Response(text, { status: r.status, headers: { "content-type": "application/json" } });
}
