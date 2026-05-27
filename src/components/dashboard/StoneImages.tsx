import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { optimiseImage, formatBytes } from "@/lib/image-optimise";

type Img = { id: string; storage_url: string; is_primary: boolean; sort_order: number };

export function StoneImages({ stoneId, dealerId }: { stoneId: string; dealerId: string }) {
  const [images, setImages] = useState<Img[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("stone_images")
      .select("id, storage_url, is_primary, sort_order")
      .eq("stone_id", stoneId)
      .order("sort_order");
    setImages((data as Img[]) ?? []);
  }, [stoneId]);

  useEffect(() => { load(); }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    setProgress([]);
    try {
      for (const file of files) {
        const opt = await optimiseImage(file);
        setProgress((p) => [...p, `${file.name}: ${formatBytes(opt.originalBytes)} → ${formatBytes(opt.finalBytes)}`]);
        const path = `${dealerId}/${stoneId}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage.from("stone-images").upload(path, opt.blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/webp",
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("stone-images").getPublicUrl(path);
        const isFirst = images.length === 0;
        const { error: insErr } = await supabase.from("stone_images").insert({
          stone_id: stoneId,
          storage_url: pub.publicUrl,
          is_primary: isFirst,
          sort_order: images.length,
        });
        if (insErr) throw insErr;
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function setPrimary(id: string) {
    await supabase.from("stone_images").update({ is_primary: false }).eq("stone_id", stoneId);
    await supabase.from("stone_images").update({ is_primary: true }).eq("id", id);
    load();
  }

  async function remove(img: Img) {
    if (!confirm("Remove this image?")) return;
    // Extract storage path from public URL
    const marker = "/stone-images/";
    const idx = img.storage_url.indexOf(marker);
    if (idx >= 0) {
      const path = img.storage_url.slice(idx + marker.length);
      await supabase.storage.from("stone-images").remove([path]);
    }
    await supabase.from("stone_images").delete().eq("id", img.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Images</h2>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} disabled={uploading} />
          <span className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {uploading ? "Uploading…" : "Upload images"}
          </span>
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {progress.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          {progress.map((p, i) => (<li key={i}>Optimised: {p}</li>))}
        </ul>
      )}
      {images.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-md border border-border">
              <img src={img.storage_url} alt="" className="aspect-square w-full object-cover" />
              {img.is_primary && (
                <span className="absolute left-2 top-2 rounded bg-[var(--color-gold)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-gold-foreground)]">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.is_primary && (
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-white" onClick={() => setPrimary(img.id)}>
                    Make primary
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" className="h-7 text-white" onClick={() => remove(img)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}