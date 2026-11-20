import { FIELDS, getMeta } from "@/lib/data";
import MethodView from "@/components/MethodView";

export const metadata = { title: "Methodik und Korrekturen" };

export default function MethodikPage() {
  const meta = getMeta();
  const by = (t: string) => meta.corrections.filter((c) => c.type === t);
  const merged = by("Spieler zusammengefuehrt");
  const cleaned = by("Name bereinigt");
  const excluded = by("Spiel ausgeschlossen");
  const swapped = by("Heim/Gast getauscht");

  return (
    <MethodView
      builtAt={meta.builtAt}
      counts={meta.counts}
      checks={{ total: meta.checks.total, failed: meta.checks.failed.length }}
      sha={meta.source.databaseSha256 ?? ""}
      merged={merged.map((c) => ({ id: c.id, name: c.name ?? c.id, variants: (c.variants ?? []).map(visible), reason: c.reason }))}
      cleaned={cleaned.length}
      renamed={by("Name nach offiziellem Kader").map((c) => ({ id: c.id, detail: c.detail, reason: c.reason }))}
      excluded={excluded.map((c) => ({ id: c.id, detail: c.detail, reason: c.reason }))}
      swapped={swapped.map((c) => ({ id: c.id, detail: c.detail, reason: c.reason }))}
      availabilityRule={meta.availabilityRule}
      seasons={meta.seasons}
      availability={meta.availability}
      fields={FIELDS.map((f) => ({ key: f.key, group: f.group, description: f.description ?? null }))}
    />
  );
}

/** Macht unsichtbare Zeichen sichtbar, damit erkennbar ist, worin sich Schreibweisen unterscheiden. */
function visible(name: string): string {
  return name.replace(/\u00a0/g, "⍽").replace(/\u00ad/g, "‐").replace(/^ | $/g, "⍽").replace(/ {2}/g, " ⍽");
}
