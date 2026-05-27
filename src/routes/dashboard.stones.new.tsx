import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { StoneForm, emptyStone } from "@/components/dashboard/StoneForm";

export const Route = createFileRoute("/dashboard/stones/new")({
  component: NewStone,
});

function NewStone() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div>
      <Link to="/dashboard/stones" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to inventory
      </Link>
      <h1 className="mt-2 font-serif text-3xl text-foreground">New stone</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Create the listing now — you can upload photos after saving.
      </p>
      <StoneForm initial={emptyStone} dealerId={user.id} />
    </div>
  );
}