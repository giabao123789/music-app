// web/app/favorites/page.tsx

type Track = {
  id: string;
  title: string;
  coverUrl: string;
  artist?: { name: string | null } | null;
};

async function getFavorites(): Promise<Track[]> {
  const res = await fetch("http://localhost:3000/api/favorites", {
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({} as any));

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export default async function FavoritesPage() {
  const tracks = await getFavorites();

  return (
    <main className="min-h-screen bg-transparent
 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Yêu thích</h1>

        {tracks.length === 0 ? (
          <div className="text-slate-400 text-sm">
            Chưa có bài nào được ♥
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((t) => (
              <li
                key={t.id}
                className="p-3 rounded-xl border border-slate-800 bg-slate-900/40"
              >
                <img
                  src={t.coverUrl}
                  alt={t.title}
                  className="w-full h-40 object-cover rounded-lg mb-2"
                />
                <div className="font-medium">{t.title}</div>
                <div className="text-sm text-slate-400">
                  {t.artist?.name ?? "Unknown Artist"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
