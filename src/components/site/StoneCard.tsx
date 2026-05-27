import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

export type StoneCardData = {
  id: string;
  stone_type: string;
  shape: string | null;
  carat_weight: number | null;
  origin: string | null;
  country_of_origin: string | null;
  cert_lab: string | null;
  wholesale_price_usd: number | null;
  colour_grade: string | null;
  clarity_grade: string | null;
  image?: string | null;
};

export function StoneCard({ stone }: { stone: StoneCardData }) {
  return (
    <Link
      to="/stone/$id"
      params={{ id: stone.id }}
      className="group block overflow-hidden rounded-md border border-border bg-card transition-all hover:border-[var(--color-gold)]"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {stone.image ? (
          <img
            src={stone.image}
            alt={`${stone.carat_weight ?? ""}ct ${stone.stone_type}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-muted-foreground">
            {stone.origin === "lab-grown" ? "Lab Grown" : "Natural"} · {stone.cert_lab || "—"}
          </span>
          {stone.country_of_origin && (
            <span className="text-muted-foreground">{stone.country_of_origin}</span>
          )}
        </div>
        <h3 className="mt-1 font-serif text-lg leading-tight">
          {stone.carat_weight ? `${Number(stone.carat_weight).toFixed(2)}ct ` : ""}
          <span className="capitalize">{stone.shape || ""} {stone.stone_type}</span>
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            {stone.colour_grade && <Badge variant="outline" className="font-mono">{stone.colour_grade}</Badge>}
            {stone.clarity_grade && <Badge variant="outline" className="font-mono">{stone.clarity_grade}</Badge>}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wholesale</div>
            <div className="font-mono text-sm font-semibold">
              {stone.wholesale_price_usd ? `$${Number(stone.wholesale_price_usd).toLocaleString()}` : "POA"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}