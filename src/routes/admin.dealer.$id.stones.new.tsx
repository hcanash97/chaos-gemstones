import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { StoneForm, emptyStone } from "@/components/dashboard/StoneForm";

export const Route = createFileRoute("/admin/dealer/$id/stones/new")({
  component: AdminAddStoneForDealer,
});

function AdminAddStoneForDealer() {
  const { id } = Route.useParams();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) { navigate({ to: "/login", replace: true }); return null; }
  if (!isAdmin) { navigate({ to: "/", replace: true }); return null; }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to="/admin/dealer/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to dealer
      </Link>
      <h1 className="mt-2 font-serif text-3xl text-foreground">Add stone for dealer</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        You are uploading on behalf of this dealer. The stone will be listed under their account.
      </p>
      <StoneForm initial={emptyStone} dealerId={id} draftKey={`chaos-admin-stone-draft:${id}`} />
    </div>
  );
}