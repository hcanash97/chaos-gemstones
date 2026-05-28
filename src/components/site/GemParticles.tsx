import { useMemo } from "react";

/**
 * Floating geometric gem particles for hero backgrounds.
 * Tiny SVG diamond/octagon shapes that slowly drift upward.
 */
export function GemParticles({ count = 14 }: { count?: number }) {
  const particles = useMemo(() => {
    // Deterministic pseudo-random so SSR/CSR match
    const rand = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }, (_, i) => {
      const size = 4 + Math.round(rand(i + 1) * 6); // 4-10px
      const left = Math.round(rand(i + 100) * 100); // 0-100%
      const top = Math.round(50 + rand(i + 200) * 50); // 50-100% (start lower half)
      const delay = (rand(i + 300) * 14).toFixed(2);
      const dur = (10 + rand(i + 400) * 10).toFixed(2);
      const op = (0.15 + rand(i + 500) * 0.1).toFixed(2);
      const shape = i % 2 === 0 ? "diamond" : "octagon";
      return { size, left, top, delay, dur, op, shape, i };
    });
  }, [count]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.i}
          className="gem-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            ["--gem-dur" as any]: `${p.dur}s`,
            ["--gem-delay" as any]: `${p.delay}s`,
            ["--gem-op" as any]: p.op,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="0 0 10 10" fill="none">
            {p.shape === "diamond" ? (
              <polygon points="5,0 10,5 5,10 0,5" fill="#E8C97A" />
            ) : (
              <polygon points="3,0 7,0 10,3 10,7 7,10 3,10 0,7 0,3" fill="#E8C97A" />
            )}
          </svg>
        </span>
      ))}
    </div>
  );
}
