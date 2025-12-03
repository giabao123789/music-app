import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/,"");

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id;
  if (!userId) {
    // chưa đăng nhập => trả rỗng để UI không sập
    return Response.json({ data: [] }, { status: 200 });
  }
  const url = `${BACKEND}/users/${userId}/favorites`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    const data = await r.json().catch(() => []);
    return Response.json({ data }, { status: r.status });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
