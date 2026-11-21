/**
 * Kleine Verlaufslinie (Spiel fuer Spiel) mit gestrichelter Durchschnittslinie.
 * Werte ohne Angabe (null) werden uebersprungen; unter zwei Werten wird nichts gezeichnet.
 */
export default function Sparkline({ values, label, height = 30 }: { values: (number | null)[]; label: string; height?: number }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return <div style={{ height }} aria-hidden="true" />;
  const max = Math.max(...pts.map((p) => p.v));
  const min = Math.min(0, ...pts.map((p) => p.v));
  const span = max - min || 1;
  const last = values.length - 1 || 1;
  const y = (v: number) => (height - 2 - ((v - min) / span) * (height - 4)).toFixed(1);
  const line = pts.map((p) => `${((p.i / last) * 120).toFixed(1)},${y(p.v)}`).join(" ");
  const avg = pts.reduce((a, p) => a + p.v, 0) / pts.length;
  return (
    <svg viewBox={`0 0 120 ${height}`} preserveAspectRatio="none" width="100%" height={height} role="img" aria-label={label} className="block overflow-visible">
      <line x1="0" x2="120" y1={y(avg)} y2={y(avg)} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
