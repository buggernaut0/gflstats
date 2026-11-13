import * as THREE from 'three';
import type { SceneMatchup, ScenePlayer, SceneModel } from '../data/sceneModel';
import { resolveAnchor } from './anchors';
import { createPose, type CameraPose } from './sequence';

/** Vorbereitete Perspektive auf ein Duell, mit langsamem Schub. Einzige Definition – Kamera und Panel nutzen sie. */
export function matchupPose(model: SceneModel, id: string, elapsed: number, out: CameraPose) {
  const push = Math.min(elapsed, 30) * 0.05;
  out.pos.copy(resolveAnchor(model, { at: `matchup:${id}`, offset: [-7.0 + push, 1.7, 6.6 - push * 0.6], mirror: true }));
  // Blickziel tief ansetzen: die Spieler stehen im oberen Bilddrittel, das Vergleichsfenster darunter
  out.look.copy(resolveAnchor(model, { at: `matchup:${id}`, offset: [0.4, 0.45, 0] }));
  out.fov = 30;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Welcher Spieler des Duells steht im Bild links, welcher rechts? Berechnet aus der tatsächlichen
 * Duell-Kamera: Spielerposition relativ zum Blickziel, projiziert auf den Rechts-Vektor der Kamera.
 * Unabhängig von Offense/Defense oder Team – die Kamera wechselt je nach Spielfeldseite die Seite.
 */
export function screenSides(model: SceneModel, m: SceneMatchup): [left: ScenePlayer, right: ScenePlayer] {
  const pose = createPose();
  matchupPose(model, m.id, 0, pose);
  const right = pose.look.clone().sub(pose.pos).cross(UP);
  const x = (p: ScenePlayer) => new THREE.Vector3(...p.world).sub(pose.look).dot(right);
  return x(m.offense) <= x(m.defense) ? [m.offense, m.defense] : [m.defense, m.offense];
}
