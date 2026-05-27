import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/embed/$key")({
  component: EmbedFeed,
  head: () => ({
    meta: [
      { title: "Chaos Feed" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Stone = {
  id: string;
  stone_type: string;
  shape: string | null;
  carat_weight: number | null;
  origin: string | null;
  country_of_origin: string | null;
  cert_lab: string | null;
  colour_grade: string | null;
  clarity_grade: string | null;
  retail_price: number | null;
  stone_images?: { storage_url: string; is_primary?: boolean }[];
};

function EmbedFeed() {
  const { key } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["embed-feed", key],
    queryFn: async () => {
      const res = await fetch(`/api/public/feed?key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error((await res.json())?.error ?? "Feed error");
      return res.json() as Promise<{ count: number; stones: Stone[] }>;
    },
  });

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 16, background: "#fff" }}>
      <style>{`
        .chaos-grid { display: grid; gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
        .chaos-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;
          background: #fff; transition: box-shadow .2s, transform .2s; }
        .chaos-card:hover { box-shadow: 0 8px 24px rgba(15,27,61,.10); transform: translateY(-2px); }
        .chaos-img { aspect-ratio: 1/1; background: #f5f3ee; display:flex;
          align-items:center; justify-content:center; color:#94a3b8; font-size:11px; }
        .chaos-img img { width: 100%; height: 100%; object-fit: cover; display:block; }
        .chaos-meta { padding: 12px; }
        .chaos-title { font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 18px; color: #0F1B3D; text-transform: capitalize; }
        .chaos-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .chaos-price { font-size: 14px; color: #0F1B3D; margin-top: 8px; font-weight: 600; }
        .chaos-empty, .chaos-error { padding: 32px; text-align: center; color: #64748b; font-size: 14px; }
      `}</style>
      {isLoading && <div className="chaos-empty">Loading inventory…</div>}
      {error && <div className="chaos-error">Unable to load feed. Check the API key.</div>}
      {data && data.stones.length === 0 && (
        <div className="chaos-empty">No stones in this feed yet.</div>
      )}
      {data && data.stones.length > 0 && (
        <div className="chaos-grid">
          {data.stones.map((s) => {
            const img = s.stone_images?.find((i) => i.is_primary)?.storage_url
              ?? s.stone_images?.[0]?.storage_url;
            return (
              <div className="chaos-card" key={s.id}>
                <div className="chaos-img">
                  {img ? <img src={img} alt={s.stone_type} loading="lazy" /> : "No image"}
                </div>
                <div className="chaos-meta">
                  <div className="chaos-title">
                    {s.carat_weight ? `${s.carat_weight}ct ` : ""}{s.stone_type}
                  </div>
                  <div className="chaos-sub">
                    {[s.shape, s.origin ?? s.country_of_origin, s.cert_lab].filter(Boolean).join(" · ")}
                  </div>
                  {s.retail_price != null && (
                    <div className="chaos-price">${s.retail_price.toLocaleString()}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}