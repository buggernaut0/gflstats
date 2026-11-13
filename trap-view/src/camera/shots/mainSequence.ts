import type { SceneModel } from '../../data/sceneModel';
import type { Shot } from '../sequence';

/**
 * Die Hauptpräsentation: A Establishing → B Offensive Line → C Backfield →
 * D Receiver-Duelle → E Defense → F Final Shot.
 *
 * Alle Positionen sind Anker relativ zur Aufstellung (siehe anchors.ts). Die Duell-Einstellungen
 * werden aus den übergebenen Matchups erzeugt – andere Teams oder Formationen brauchen
 * keine Änderung an dieser Datei.
 */
export function buildMainSequence(model: SceneModel): Shot[] {
  const duels: Shot[] = model.matchups.map((m, i) => ({
    id: `duel-${m.id}`,
    title: 'On the Perimeter',
    subtitle: `${m.offense.player.position} #${m.offense.player.number} vs ${m.defense.player.position} #${m.defense.player.number}`,
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

  return [
    {
      id: 'establishing',
      title: 'The Matchup',
      subtitle: `${model.offense.name} vs ${model.defense.name}`,
      duration: 12,
      path: [
        { at: 'los', offset: [-78, 58, 54] },
        { at: 'los', offset: [-50, 33, 37] },
        { at: 'los', offset: [-29, 16, 22] },
      ],
      lookAt: [
        { at: 'los', offset: [0, 0, 0] },
        { at: 'los', offset: [1, 1, 0] },
      ],
      fov: [30, 36],
      ease: 'out',
      transition: { type: 'dip' },
      labels: [],
    },
    {
      id: 'offensive-line',
      title: 'The Line',
      subtitle: 'Offensive Line',
      duration: 11,
      path: [
        { at: 'group:OL:min', offset: [8.2, 4.1, -5.5] },
        { at: 'group:OL:max', offset: [8.2, 3.9, 5.5] },
      ],
      lookAt: [
        { at: 'group:OL:min', offset: [0, 1.25, -0.6] },
        { at: 'group:OL:max', offset: [0, 1.25, 0.6] },
      ],
      fov: [30, 30],
      ease: 'soft',
      transition: { type: 'blend', duration: 2.8 },
      labels: ['group:OL'],
    },
    {
      id: 'backfield',
      title: 'Backfield',
      subtitle: 'Quarterback & Running Back',
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
      labels: ['role:QB', 'role:RB'],
    },
    ...duels,
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
    {
      id: 'final',
      title: 'Face to Face',
      subtitle: `${model.offense.nickname} · ${model.defense.nickname}`,
      duration: 16,
      path: [
        { at: 'los', offset: [9, 3.2, 24] },
        { at: 'los', offset: [1, 8.5, 34] },
        { at: 'los', offset: [-1, 12.5, 39] },
      ],
      lookAt: [
        { at: 'los', offset: [0.5, 1.1, 0] },
        { at: 'los', offset: [0, 0, 0] },
      ],
      fov: [34, 40],
      ease: 'soft',
      transition: { type: 'blend', duration: 3.2 },
      labels: [],
    },
  ];
}
