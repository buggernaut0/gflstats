import * as THREE from 'three';
import { playerTag, type SceneModel, type SceneSpotlight } from '../../data/sceneModel';
import type { AnchorSpec } from '../anchors';
import type { Shot } from '../sequence';

/** Dauer einer Spotlight-Einstellung: Anfahrt, Karte steht ~5 s, Abgang. */
export const SPOTLIGHT_DURATION = 7.4;
/** Weiche Kamerafahrt vom einen vorgestellten Spieler zum nächsten (statt Schnitt). */
const HANDOVER = 1.6;

/** Brust-/Schulterhöhe, auf die die Kamera zielt (Yards); tief gebückte Haltungen (Linemen) tiefer. */
const AIM_Y = 1.2;
const AIM_Y_LOW = 0.72;
const LOW_STANCES = new Set(['threePoint', 'lineSet']);
/** Abstand Kamera–Spieler am Anfang und Ende der Einstellung (langsamer Push-in). */
const DIST: [number, number] = [7.8, 5.4];
const HEIGHT_DEFAULT: [number, number] = [2.0, 1.55];
const HEIGHT_LOW: [number, number] = [1.7, 1.2];
/** Seitlicher Versatz des Blickziels als Anteil der Distanz: schiebt den Spieler ins linke bzw. rechte Bilddrittel. */
const SHIFT = 0.17;
/**
 * Kandidaten für den Blickwinkel (Grad zur Blickrichtung des Spielers); kleinere Winkel = frontaler und
 * bevorzugt. Linemen stehen Nase an Nase – für sie bleibt oft nur die Seite oder schräg hinten.
 */
const ANGLES = [-10, 10, -22, 22, -36, 36, -50, 50, -64, 64, -80, 80, -100, 100, -125, 125, -150, 150];
/** Leichter Bogen während der Fahrt (Grad), damit die Kamera nicht nur geradeaus schiebt. */
const ARC = 7;

const UP = new THREE.Vector3(0, 1, 0);

/** Wie viele andere Spieler stehen zwischen Kamera und Spieler? (Körper ≈ senkrechte Säule, Radius ~0,9 yd) */
function occlusion(model: SceneModel, target: THREE.Vector3, cams: THREE.Vector3[], self: string): number {
  let cost = 0;
  const a = new THREE.Vector2();
  const b = new THREE.Vector2();
  const q = new THREE.Vector2();
  for (const cam of cams) {
    a.set(cam.x, cam.z);
    b.set(target.x, target.z);
    const ab = b.clone().sub(a);
    const len2 = ab.lengthSq();
    for (const p of model.players) {
      if (p.id === self) continue;
      // Unbesetzte Plätze sind nur durchscheinende Silhouetten – stören weniger
      const w = p.player ? 1 : 0.5;
      q.set(p.world[0], p.world[2]);
      const raw = q.clone().sub(a).dot(ab) / len2;
      const t = THREE.MathUtils.clamp(raw, 0, 1.8);
      const d = a.clone().addScaledVector(ab, t).distanceTo(q);
      // Kamera steckt im Spieler oder Spieler verdeckt die Sicht
      if (t < 0.03 && d < 1.3) cost += 3 * w;
      else if (t < 0.93 && d < 1.1) cost += (2.1 - d) * w;
      // Spieler direkt dahinter verschmilzt mit der Silhouette (weniger schlimm als Verdecken)
      else if (raw > 1.02 && raw < 1.8 && d < 1.1) cost += 0.12 * (1.1 - d) * w;
    }
  }
  return cost;
}

function cameraAt(target: THREE.Vector3, facing: THREE.Vector3, deg: number, dist: number, h: number) {
  const dir = facing.clone().applyAxisAngle(UP, THREE.MathUtils.degToRad(deg));
  return new THREE.Vector3(target.x + dir.x * dist, h, target.z + dir.z * dist);
}

/** Blickziel so versetzen, dass der Spieler im Bilddrittel gegenüber der Karte steht. */
function aimFrom(cam: THREE.Vector3, target: THREE.Vector3, playerLeft: boolean) {
  const f = target.clone().sub(cam);
  const right = f.clone().cross(UP).normalize();
  return target.clone().addScaledVector(right, (playerLeft ? 1 : -1) * SHIFT * f.length());
}

/**
 * Kamerapfad für einen vorgestellten Spieler: von vorn (aus Sicht seines Gegners) auf ihn zu, mit
 * dem Blickwinkel, bei dem ihn am wenigsten Mitspieler oder Gegner verdecken. Offense-Spieler stehen
 * links im Bild (Karte rechts), Defense-Spieler rechts (Karte links) – das wechselt also mit jeder Karte.
 */
function spotlightShot(model: SceneModel, s: SceneSpotlight, prevWasSpotlight: boolean): Shot {
  const p = s.player;
  const base = new THREE.Vector3(...p.world);
  const low = LOW_STANCES.has(p.slot.stance);
  const target = base.clone().setY(low ? AIM_Y_LOW : AIM_Y);
  const HEIGHT = low ? HEIGHT_LOW : HEIGHT_DEFAULT;
  const facing = new THREE.Vector3(p.side === 'offense' ? 1 : -1, 0, 0);
  const playerLeft = s.side === 'offense';

  let best = { deg: ANGLES[0], cost: Infinity };
  for (const deg of ANGLES) {
    const cams = [
      cameraAt(target, facing, deg - ARC, DIST[0], HEIGHT[0]),
      cameraAt(target, facing, deg, (DIST[0] + DIST[1]) / 2, HEIGHT[1]),
      cameraAt(target, facing, deg + ARC, DIST[1], HEIGHT[1]),
    ];
    // Von vorn bevorzugt; ab 70° (Seite/hinten) deutlich teurer – nur, wenn vorn wirklich alles verdeckt ist
    const a = Math.abs(deg);
    const cost = occlusion(model, target, cams, p.id) * 10 + (a <= 70 ? a / 60 : 1.2 + (a - 70) / 20);
    if (cost < best.cost) best = { deg, cost };
  }

  // Bogen läuft vom Spielfeldinneren nach außen – die Kamera „öffnet“ sich zur Seite der Karte
  const arc = playerLeft ? -ARC : ARC;
  const path = [
    cameraAt(target, facing, best.deg - arc, DIST[0], HEIGHT[0]),
    cameraAt(target, facing, best.deg, (DIST[0] + DIST[1]) / 2, (HEIGHT[0] + HEIGHT[1]) / 2),
    cameraAt(target, facing, best.deg + arc, DIST[1], HEIGHT[1]),
  ];
  const look = [aimFrom(path[0], target, playerLeft), aimFrom(path[2], target, playerLeft)];
  const rel = (v: THREE.Vector3): AnchorSpec => ({
    at: `role:${p.role}`,
    offset: [v.x - base.x, v.y, v.z - base.z],
  });

  const sideName = s.side === 'offense' ? 'Offense' : 'Defense';
  return {
    id: `spotlight-${s.side}-${s.rank}`,
    title: 'Player Spotlight',
    subtitle: `${sideName} ${s.rank}/${s.ofSide} · ${playerTag(p)}`,
    duration: SPOTLIGHT_DURATION,
    path: path.map(rel),
    lookAt: look.map(rel),
    fov: [30, 27],
    ease: 'soft',
    // Innerhalb eines Spotlight-Blocks fließt die Kamera zum nächsten Spieler, sonst harter Schnitt
    transition: prevWasSpotlight ? { type: 'blend', duration: HANDOVER } : { type: 'dip' },
    labels: [],
    spotlight: s.order,
  };
}

/**
 * Spotlight-Einstellungen in Blöcken (je zwei: Offense, dann Defense). buildMainSequence verteilt die
 * Blöcke über die Fahrt, damit sich Formation, Duelle und Spielervorstellung abwechseln.
 */
export function spotlightBlocks(model: SceneModel, blockSize = 2): Shot[][] {
  const blocks: Shot[][] = [];
  model.spotlights.forEach((s, i) => {
    const first = i % blockSize === 0;
    if (first) blocks.push([]);
    blocks[blocks.length - 1].push(spotlightShot(model, s, !first));
  });
  return blocks;
}
