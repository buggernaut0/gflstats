import * as THREE from 'three';
import type { SceneModel, ScenePlayer } from '../data/sceneModel';

/**
 * Ein Anker beschreibt einen Punkt relativ zur aktuellen Aufstellung statt als feste Koordinate.
 *
 * `at`:
 *   "los"                     – Ball / Mitte der Line of Scrimmage
 *   "role:QB"                 – ein Spieler über seine Rolle in der Formation
 *   "group:OL"                – Schwerpunkt einer Positionsgruppe
 *   "group:OL:min" / ":max"   – äußerster Spieler der Gruppe (links / rechts)
 *   "side:offense|defense"    – Schwerpunkt eines Teams
 *   "matchup:<id>"            – Mitte zwischen den beiden Spielern eines Duells
 *
 * `offset`: [in Angriffsrichtung, nach oben, nach rechts] in Yards.
 * `mirror`: spiegelt den seitlichen Versatz zur näheren Seitenlinie hin (für Duelle außen).
 */
export interface AnchorSpec {
  at: string;
  offset?: [number, number, number];
  mirror?: boolean;
}

function centroid(players: ScenePlayer[], out: THREE.Vector3) {
  out.set(0, 0, 0);
  for (const p of players) out.add(new THREE.Vector3(...p.world));
  return players.length ? out.divideScalar(players.length) : out;
}

export function resolveAnchor(model: SceneModel, spec: AnchorSpec): THREE.Vector3 {
  const out = new THREE.Vector3();
  const [kind, key, mod] = spec.at.split(':');

  if (kind === 'los') {
    out.set(model.losX, 0, 0);
  } else if (kind === 'role') {
    const p = model.byRole.get(key);
    if (p) out.set(...p.world);
    else out.set(model.losX, 0, 0);
  } else if (kind === 'group') {
    const members = model.players.filter((p) => p.group === key);
    if (mod === 'min' || mod === 'max') {
      const sorted = [...members].sort((a, b) => a.world[2] - b.world[2]);
      const p = mod === 'min' ? sorted[0] : sorted[sorted.length - 1];
      if (p) out.set(...p.world);
    } else {
      centroid(members, out);
    }
  } else if (kind === 'side') {
    centroid(model.players.filter((p) => p.side === key), out);
  } else if (kind === 'matchup') {
    const m = model.matchups.find((x) => x.id === key);
    if (m) centroid([m.offense, m.defense], out);
  }

  if (spec.offset) {
    const [dx, dy, dz] = spec.offset;
    const sign = spec.mirror && out.z < 0 ? -1 : 1;
    out.x += dx;
    out.y += dy;
    out.z += dz * sign;
  }
  return out;
}

/** Löst Label-Selektoren ("group:OL", "role:QB", "matchup:<id>") in Spieler-IDs auf. */
export function resolveLabelIds(model: SceneModel, selectors: string[]): string[] {
  const ids: string[] = [];
  for (const sel of selectors) {
    const [kind, key] = sel.split(':');
    if (kind === 'role') {
      const p = model.byRole.get(key);
      if (p) ids.push(p.id);
    } else if (kind === 'group') {
      for (const p of model.players) if (p.group === key) ids.push(p.id);
    } else if (kind === 'matchup') {
      const m = model.matchups.find((x) => x.id === key);
      if (m) ids.push(m.offense.id, m.defense.id);
    }
  }
  return ids;
}
