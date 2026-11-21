// Tests fuer die zentrale Zuordnung der Spielerfotos (curation/player_photos.json). Ausfuehren: npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const mapping = JSON.parse(fs.readFileSync(new URL("curation/player_photos.json", root), "utf8")) as {
  photos: Record<string, { team: string; number: number; name: string; image: string; source: string }>;
};
const rosters = JSON.parse(fs.readFileSync(new URL("curation/rosters.json", root), "utf8")).rosters as Record<
  string, Record<string, { players: { player: string | null; number: number; name: string }[] }>
>;
const players = JSON.parse(fs.readFileSync(new URL("web/public/data/players.json", root), "utf8")) as {
  id: string; shared: boolean; photo?: { src: string; source: string };
}[];

test("Jedes zugeordnete Foto gehoert zu einem Kadereintrag mit derselben Spieler-ID, Nummer und Mannschaft", () => {
  for (const [id, ph] of Object.entries(mapping.photos)) {
    const entry = rosters["2026"][ph.team]?.players.find((p) => p.player === id);
    assert.ok(entry, `${id}: nicht im Kader von ${ph.team}`);
    assert.equal(entry.number, ph.number, `${id}: Rueckennummer weicht vom Kader ab`);
  }
});

test("Kein Foto ist zwei Spielern zugeordnet", () => {
  const seen = new Map<string, string>();
  for (const [id, ph] of Object.entries(mapping.photos)) {
    const key = ph.image.split("?")[0].replace(/-\d+x\d+(?=\.\w+$)/, "");
    assert.ok(!seen.has(key), `${id} und ${seen.get(key)} teilen sich ein Foto`);
    seen.set(key, id);
  }
});

test("Website-Daten verweisen nur auf vorhandene Fotodateien der zentralen Zuordnung", () => {
  for (const p of players) {
    if (!p.photo) continue;
    assert.ok(mapping.photos[p.id], `${p.id}: Foto ohne Eintrag in player_photos.json`);
    assert.ok(!p.shared, `${p.id}: Sammeleintrag darf kein Foto haben`);
    assert.match(p.photo.src, new RegExp(`^players/${p.id}\\.webp\\?v=[0-9a-f]{8}$`));
    assert.ok(fs.existsSync(new URL(`web/public/players/${p.id}.webp`, root)), `${p.id}: Datei fehlt`);
  }
});
