import { useState } from "react";

export function StarInput({
  value,
  onChange,
  size = "h-6 w-6",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          aria-checked={value === i}
          role="radio"
          className="cursor-pointer transition-transform hover:scale-110"
        >
          <svg
            className={`${size} ${i <= display ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "fill-none text-muted-foreground"}`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}