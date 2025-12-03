type Track = { id: string; title: string; coverUrl: string; artist?: { name: string | null } | null };

export default async function FavoritesPage() {
  const r = await fetch("http://localhost:3000/api/favorites", { cache: "no-store" });
  const tracks: Track[] = r.ok ? await r.json() : [];
  return (
    <main className="min-h-screen bg-transparent
 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Yêu thích</h1>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map(t => (
            <li key={t.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
              <img src={t.coverUrl} className="w-full h-40 object-cover rounded-lg mb-2" />
              <div className="font-medium">{t.title}</div>
              <div className="text-sm text-slate-400">{t.artist?.name ?? "Unknown"}</div>
            </li>
          ))}
          {tracks.length === 0 && <div className="text-slate-400">Chưa có bài nào ♥</div>}
        </ul>
      </div>
    </main>
  );
}
