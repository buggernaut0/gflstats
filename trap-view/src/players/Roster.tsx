import { useEffect, useMemo } from 'react';
import type { SceneModel } from '../data/sceneModel';
import { PlayerModel } from './PlayerModel';
import { createKitMaterials, disposeKitMaterials } from './materials';

/** Erzeugt alle Spieler der Partie aus dem aufgelösten Szenenmodell. */
export function Roster({ model }: { model: SceneModel }) {
  const offenseMats = useMemo(() => createKitMaterials(model.offenseKit), [model.offenseKit]);
  const defenseMats = useMemo(() => createKitMaterials(model.defenseKit), [model.defenseKit]);
  useEffect(() => () => disposeKitMaterials(offenseMats), [offenseMats]);
  useEffect(() => () => disposeKitMaterials(defenseMats), [defenseMats]);

  return (
    <group>
      {model.players.map((p, i) => (
        <PlayerModel
          key={p.id}
          position={p.world}
          rotationY={p.rotationY}
          number={p.player?.number ?? null}
          lastName={p.shortName}
          ghost={!p.player}
          build={p.slot.build}
          stance={p.slot.stance}
          kit={p.kit}
          materials={p.side === 'offense' ? offenseMats : defenseMats}
          seed={i * 7 + (p.player?.number ?? i)}
        />
      ))}
    </group>
  );
}
