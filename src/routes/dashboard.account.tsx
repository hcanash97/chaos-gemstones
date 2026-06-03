import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { exportMyData, deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isDealer as checkD, isJeweller as checkJ } from "@/lib/auth.utils";

export const Route = createFileRoute("/dashboard/account")({
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const exportFn = useServerFn(exportMyData);
  const deleteFn = useServerFn(deleteMyAccount);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onExport() {
    setExporting(true);
    try {
      const data = await exportFn({});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chaos-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data has been exported");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteFn({});
      await supabase.auth.signOut();
      toast.success("Your account has been deleted");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Account & privacy</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your public profile, export your data, or permanently delete your account.
      </p>

      <div className="mt-8 space-y-6">
        {user && checkJ(profile) && <JewellerPublicProfileForm userId={user.id} />}
        {user && checkD(profile) && <DealerPublicProfileForm userId={user.id} />}

        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Export my data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Download a JSON file containing your profile, API keys (without secret values), enquiries, and orders.
          </p>
          <Button onClick={onExport} disabled={exporting} className="mt-4">
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Preparing…" : "Export my data"}
          </Button>
        </section>

        <section className="rounded-md border border-destructive/40 bg-destructive/5 p-6">
          <h2 className="font-serif text-xl text-destructive">Delete my account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This permanently removes your account, API keys, and personal data. Stone listings (if a dealer) are
            archived; enquiry messages you've sent are anonymised. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-4" disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your Chaos account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Your profile will be marked deleted, your API keys removed, any stone listings
                  archived, and your enquiry messages anonymised.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting…" : "Yes, delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </div>
  );
}

const JEWELLER_SPECIALITIES = [
  "Engagement rings", "Fine jewellery", "Bespoke commissions", "Bridal",
  "Antique restoration", "High jewellery", "Men's jewellery", "Wedding bands",
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60);
}

async function uploadImage(file: File, userId: string, prefix: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${prefix}/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("stone-images").upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    toast.error(error.message);
    return null;
  }
  const { data } = supabase.storage.from("stone-images").getPublicUrl(path);
  return data.publicUrl;
}

function JewellerPublicProfileForm({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    logo_url: "" as string,
    tagline: "" as string,
    instagram_url: "" as string,
    website: "" as string,
    founded_year: "" as string,
    specialities: [] as string[],
    slug: "" as string,
    is_public: true,
  });

  useEffect(() => {
    (async () => {
      const [{ data: jp }, { data: p }] = await Promise.all([
        (supabase as any).from("jeweller_profiles").select("logo_url, tagline, instagram_url, website, founded_year, specialities, slug, is_public").eq("id", userId).maybeSingle(),
        supabase.from("profiles").select("company_name").eq("id", userId).maybeSingle(),
      ]);
      setForm({
        logo_url: jp?.logo_url ?? "",
        tagline: jp?.tagline ?? "",
        instagram_url: jp?.instagram_url ?? "",
        website: jp?.website ?? "",
        founded_year: jp?.founded_year ? String(jp.founded_year) : "",
        specialities: jp?.specialities ?? [],
        slug: jp?.slug ?? (p?.company_name ? slugify(p.company_name) : ""),
        is_public: jp?.is_public ?? true,
      });
      setLoading(false);
    })();
  }, [userId]);

  async function onLogo(file: File) {
    const url = await uploadImage(file, userId, "jeweller-logos");
    if (url) setForm((f) => ({ ...f, logo_url: url }));
  }

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      logo_url: form.logo_url || null,
      tagline: form.tagline.slice(0, 80) || null,
      instagram_url: form.instagram_url || null,
      website: form.website || null,
      founded_year: form.founded_year ? Number(form.founded_year) : null,
      specialities: form.specialities,
      slug: form.slug ? slugify(form.slug) : null,
      is_public: form.is_public,
    };
    const { error } = await (supabase as any).from("jeweller_profiles").update(payload).eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Public profile saved");
  }

  if (loading) return null;

  return (
    <section className="rounded-md border border-border bg-card p-6">
      <h2 className="font-serif text-xl">Public jeweller profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How dealers see you when you send an enquiry, and what appears on your public /jewellers profile.
      </p>
      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            <img src={form.logo_url} alt="" className="h-16 w-16 rounded-full border-2 border-[var(--color-gold)] object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted text-xs text-muted-foreground">No logo</div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" /> Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
          </label>
        </div>
        <div>
          <Label htmlFor="jp-tagline">Tagline (max 80 chars)</Label>
          <Input id="jp-tagline" maxLength={80} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="mt-1.5" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="jp-website">Website</Label>
            <Input id="jp-website" placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="jp-insta">Instagram</Label>
            <Input id="jp-insta" placeholder="https://instagram.com/…" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="jp-founded">Founded year</Label>
            <Input id="jp-founded" type="number" min={1800} max={new Date().getFullYear()} value={form.founded_year} onChange={(e) => setForm({ ...form, founded_year: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="jp-slug">Profile URL slug</Label>
            <Input id="jp-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1.5" />
            <p className="mt-1 text-[11px] text-muted-foreground">chaosgemstones.com/jewellers/{form.slug || "your-slug"}</p>
          </div>
        </div>
        <div>
          <Label>Specialities</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {JEWELLER_SPECIALITIES.map((s) => {
              const on = form.specialities.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      specialities: on ? f.specialities.filter((x) => x !== s) : [...f.specialities, s],
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-gold-foreground)]" : "border-border hover:border-[var(--color-gold)]"}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: !!v })} />
          Show my public profile in the /jewellers directory
        </label>
        <Button onClick={save} disabled={saving} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
          {saving ? "Saving…" : "Save public profile"}
        </Button>
      </div>
    </section>
  );
}

function DealerPublicProfileForm({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    logo_url: "" as string,
    cover_image_url: "" as string,
    tagline: "" as string,
    story: "" as string,
    instagram_url: "" as string,
    founded_year: "" as string,
    certifications: [] as string[],
    cert_input: "" as string,
  });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("dealer_profiles")
        .select("logo_url, cover_image_url, tagline, story, instagram_url, founded_year, certifications")
        .eq("id", userId)
        .maybeSingle();
      setForm((f) => ({
        ...f,
        logo_url: data?.logo_url ?? "",
        cover_image_url: data?.cover_image_url ?? "",
        tagline: data?.tagline ?? "",
        story: data?.story ?? "",
        instagram_url: data?.instagram_url ?? "",
        founded_year: data?.founded_year ? String(data.founded_year) : "",
        certifications: data?.certifications ?? [],
      }));
      setLoading(false);
    })();
  }, [userId]);

  async function onLogo(file: File) {
    const url = await uploadImage(file, userId, "dealer-logos");
    if (url) setForm((f) => ({ ...f, logo_url: url }));
  }
  async function onCover(file: File) {
    const url = await uploadImage(file, userId, "dealer-covers");
    if (url) setForm((f) => ({ ...f, cover_image_url: url }));
  }

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("dealer_profiles").update({
      logo_url: form.logo_url || null,
      cover_image_url: form.cover_image_url || null,
      tagline: form.tagline || null,
      story: form.story || null,
      instagram_url: form.instagram_url || null,
      founded_year: form.founded_year ? Number(form.founded_year) : null,
      certifications: form.certifications,
    }).eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Dealer profile saved");
  }

  if (loading) return null;

  return (
    <section className="rounded-md border border-border bg-card p-6">
      <h2 className="font-serif text-xl">Public dealer profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">Appears on your /vendors profile page.</p>
      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            <img src={form.logo_url} alt="" className="h-16 w-16 rounded-full border-2 border-[var(--color-gold)] object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted text-xs text-muted-foreground">No logo</div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" /> Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
          </label>
        </div>
        <div>
          <Label>Cover image</Label>
          {form.cover_image_url && (
            <img src={form.cover_image_url} alt="" className="mt-2 h-32 w-full rounded-md border border-border object-cover" />
          )}
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" /> {form.cover_image_url ? "Replace" : "Upload"} cover
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="dp-tag">Tagline</Label>
            <Input id="dp-tag" maxLength={120} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="dp-insta">Instagram</Label>
            <Input id="dp-insta" placeholder="https://instagram.com/…" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="dp-year">Founded year</Label>
            <Input id="dp-year" type="number" min={1800} max={new Date().getFullYear()} value={form.founded_year} onChange={(e) => setForm({ ...form, founded_year: e.target.value })} className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label htmlFor="dp-story">Our story</Label>
          <Textarea id="dp-story" rows={5} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} className="mt-1.5" placeholder="Based in Jaipur's gem district, we have been cutting and polishing coloured stones for three generations…" />
        </div>
        <div>
          <Label>Certifications & memberships</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {form.certifications.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-1 text-xs text-[var(--color-gold)]">
                {c}
                <button type="button" onClick={() => setForm((f) => ({ ...f, certifications: f.certifications.filter((x) => x !== c) }))} className="opacity-60 hover:opacity-100">×</button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="e.g. GJEPC, BJA, AGTA"
              value={form.cert_input}
              onChange={(e) => setForm({ ...form, cert_input: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && form.cert_input.trim()) {
                  e.preventDefault();
                  setForm((f) => ({ ...f, certifications: [...f.certifications, f.cert_input.trim()], cert_input: "" }));
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => form.cert_input.trim() && setForm((f) => ({ ...f, certifications: [...f.certifications, f.cert_input.trim()], cert_input: "" }))}>Add</Button>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
          {saving ? "Saving…" : "Save dealer profile"}
        </Button>
      </div>
    </section>
  );
}