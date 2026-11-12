const KINDS = {
  original: { label: "Original", hint: "Summe der Werte aus den Spielbögen von statsnscore.online" },
  derived: { label: "Berechnet", hint: "Aus Originalwerten berechnet; Formel auf der Methodik-Seite" },
  rank: { label: "Ranking", hint: "Sortierung der Werte; gleiche Werte teilen sich den Rang" },
  model: { label: "Modell", hint: "Eigene Bewertung; Kriterien und Gewichte auf der Methodik-Seite" },
} as const;

/** Kennzeichnet, woher eine Zahl stammt (Original, Berechnet, Ranking, Modell). */
export default function SourceTag({ kind, detail }: { kind: keyof typeof KINDS; detail?: string }) {
  const k = KINDS[kind];
  return (
    <span
      title={detail ? `${k.hint}. ${detail}` : k.hint}
      className="inline-flex cursor-help items-center rounded-full border border-line px-2 py-[1px] text-[11px] font-medium text-ink-3"
    >
      {k.label}
    </span>
  );
}
