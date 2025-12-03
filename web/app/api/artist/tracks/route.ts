import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "ARTIST" && role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const r = await fetch(`${BACKEND}/artist/tracks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(session as any).accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return new Response(text, { status: r.status });
}
