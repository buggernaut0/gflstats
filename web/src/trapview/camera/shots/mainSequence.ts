import { playerTag, type SceneModel } from '../../data/sceneModel';
import type { AnchorSpec } from '../anchors';
import type { Shot } from '../sequence';
import { spotlightBlocks } from './spotlight';

/** Ab dieser Einstellung wiederholt sich die Fahrt endlos (der Einstieg läuft nur einmal). */
export const LOOP_FROM = 'line-of-scrimmage';

/** Mitte beider Lines – um sie kreist die Kamera an der Line of Scrimmage. */
const LINES = 'group:OL+DL';
/**
 * Punkt auf einer Kreisbahn um die Lines. θ in Grad: 0 = hinter der Offense, 90 = seitlich auf
 * Höhe der Line of Scrimmage (rechte Feldseite), 180 = hinter der Defense; r = Abstand, h = Höhe (Yards).
 */
const orbit = (deg: number, r: number, h: number): AnchorSpec => {
  const a = (deg * Math.PI) / 180;
  return { at: LINES, offset: [-r * Math.cos(a), h, r * Math.sin(a)] };
};
/** Blickziel auf Schulterhöhe der Linemen, leicht zur Offense bzw. Defense verschoben. */
const linesLook = (dx: number): AnchorSpec => ({ at: LINES, offset: [dx, 0.75, 0] });

/**
 * Die Hauptpräsentation: A Einstieg → B Line of Scrimmage (O-Line und D-Line) → S1 Player Spotlight →
 * C Backfield → D Receiver-Duelle → S2 Player Spotlight → E Defense → S3 Player Spotlight → F Final Shot →
 * nahtlos wieder B, … (Endlosschleife).
 *
 * Player Spotlights (S1–S3, je ein Offense- und ein Defense-Spieler, siehe spotlight.ts) sind zwischen die
 * bestehenden Einstellungen gesetzt, die selbst unverändert bleiben. Gibt es weniger vorgestellte Spieler,
 * entfallen die hinteren Blöcke – die Fahrt wird nur so lang, wie es etwas zu zeigen gibt.
 *
 * Einstieg und Final Shot münden per `flow` in denselben Startpunkt der Line-Einstellung – mit
 * gemeinsamer Tangente und gleicher Geschwindigkeit (siehe sequence.ts). So geht die Fahrt nach
 * der ersten Runde ohne Schnitt, Pause oder Richtungswechsel in die zweite über.
 *
 * Alle Positionen sind Anker relativ zur Aufstellung (siehe anchors.ts). Die Duell-Einstellungen
 * werden aus den übergebenen Matchups erzeugt – andere Teams oder Formationen brauchen
 * keine Änderung an dieser Datei.
 */
export function buildMainSequence(model: SceneModel): Shot[] {
  const ol = model.players.filter((p) => p.side === 'offense' && p.group === 'OL');
  const olFilled = ol.filter((p) => p.player).length;
  const dl = model.players.filter((p) => p.side === 'defense' && p.group === 'DL');
  const dlFilled = dl.filter((p) => p.player).length;
  const lineCount = (n: number, of: number) => (n === of ? `${n}` : `${n} von ${of}`);
  const qb = model.byRole.get('QB');
  const rbs = model.players.filter((p) => p.side === 'offense' && p.slot.position === 'RB' && p.player);
  const backfield = [qb?.player ? playerTag(qb) : null, ...rbs.map((p) => playerTag(p))].filter(Boolean).join(' · ');

  const duels: Shot[] = model.matchups.map((m, i) => ({
    id: `duel-${m.id}`,
    title: 'On the Perimeter',
    subtitle: `${playerTag(m.offense)} vs ${playerTag(m.defense)}`,
    duration: i === 0 ? 7.5 : 6.5,
    path: [
      { at: `matchup:${m.id}`, offset: [-7.6, 1.55, 7.4], mirror: true },
      { at: `matchup:${m.id}`, offset: [-6.0, 1.85, 5.6], mirror: true },
    ],
    lookAt: [{ at: `matchup:${m.id}`, offset: [0.4, 1.15, 0] }],
    fov: [31, 29],
    ease: 'linear',
    transition: { type: 'dip' },
    labels: [`matchup:${m.id}`],
  }));

  /** Startpunkt der Line-Einstellung – hier münden Einstieg und Final Shot. */
  const lineStart = orbit(40, 15, 6.4);

  const [spotA = [], spotB = [], spotC = []] = spotlightBlocks(model);

  return [
    {
      // Schneller Einstieg aus der Totalen, bremst weich ab und geht ohne Schnitt in die Line über
      id: 'establishing',
      title: 'The Matchup',
      subtitle: `${model.offense.name} vs ${model.defense.name}`,
      duration: 6.5,
      path: [orbit(12, 88, 56), orbit(20, 36, 17), lineStart],
      lookAt: [{ at: LINES, offset: [0, 0, 0] }, linesLook(-0.4)],
      fov: [30, 33],
      ease: 'out',
      transition: { type: 'dip' },
      labels: [],
    },
    {
      // Halbkreis um die Line of Scrimmage: von schräg hinter der Offense über die Seite bis schräg
      // hinter die Defense. Leicht erhöht, damit die Linemen einander nicht verdecken; vorn sind
      // Nummern der O-Line, am Ende Namen und Nummern der D-Line (Rücken) zu lesen.
      id: LOOP_FROM,
      title: 'The Trenches',
      subtitle: olFilled || dlFilled
        ? `Offensive Line ${lineCount(olFilled, ol.length)} · Defensive Line ${lineCount(dlFilled, dl.length)}`
        : 'Offensive & Defensive Line · ohne Kader nicht belegbar',
      duration: 9.5,
      path: [lineStart, orbit(65, 15, 7.6), orbit(90, 15, 8.4), orbit(115, 15, 7.6), orbit(140, 15, 6.4)],
      lookAt: [linesLook(-0.4), linesLook(0.4)],
      fov: [33, 33],
      ease: 'soft',
      transition: { type: 'flow' },
      labels: ['group:OL', 'group:DL'],
    },
    ...spotA,
    {
      id: 'backfield',
      title: 'Backfield',
      subtitle: backfield || 'Quarterback & Running Back',
      duration: 10,
      path: [
        { at: 'role:QB', offset: [-7.5, 2.9, -5.5] },
        { at: 'role:QB', offset: [-6.0, 2.3, 0.6] },
        { at: 'role:QB', offset: [-5.0, 2.0, 5.2] },
      ],
      lookAt: [
        { at: 'role:QB', offset: [2.0, 1.15, 0.4] },
        { at: 'role:QB', offset: [2.5, 1.15, 1.2] },
      ],
      fov: [36, 38],
      ease: 'soft',
      transition: { type: 'dip' },
      labels: ['role:QB', 'role:RB', 'role:RB2'],
    },
    ...duels,
    ...spotB,
    {
      id: 'defense',
      title: 'The Defense',
      subtitle: 'Front Seven & Secondary',
      duration: 12,
      path: [
        { at: 'side:defense', offset: [21, 7.5, -19] },
        { at: 'side:defense', offset: [17.5, 5, -3] },
        { at: 'side:defense', offset: [15, 3.8, 11] },
      ],
      lookAt: [
        { at: 'los', offset: [3, 1.2, 0] },
        { at: 'los', offset: [4, 1.3, 0] },
      ],
      fov: [34, 38],
      ease: 'soft',
      transition: { type: 'dip' },
      labels: ['group:LB', 'group:DB'],
    },
    ...spotC,
    {
      // Totale hinter der Offense – beide Teams Auge in Auge –, dann im Bogen hinab an die Line:
      // endet exakt am Startpunkt der Line-Einstellung, die Fahrt beginnt dort von vorn
      id: 'final',
      title: 'Face to Face',
      subtitle: `${model.offense.nickname} · ${model.defense.nickname}`,
      duration: 12,
      path: [orbit(-25, 42, 15), orbit(0, 30, 11), orbit(22, 21, 8), lineStart],
      lookAt: [{ at: LINES, offset: [0.5, 0.6, 0] }, linesLook(-0.4)],
      fov: [38, 33],
      ease: 'soft',
      transition: { type: 'dip' },
      labels: [],
    },
  ];
}
