import { useEffect, useMemo } from 'react';
import type { SceneModel } from '../data/sceneModel';
import { useTrapView } from '../state/store';
import { PlayerModel } from './PlayerModel';
import { createMaterialSet } from './materials';

/** Erzeugt alle Spieler der Partie aus dem aufgelösten Szenenmodell – im gewählten Modellstil. */
export function Roster({ model }: { model: SceneModel }) {
  const style = useTrapView((s) => s.modelStyle);
  const offenseMats = useMemo(() => createMaterialSet(model.offenseKit, style), [model.offenseKit, style]);
  const defenseMats = useMemo(() => createMaterialSet(model.defenseKit, style), [model.defenseKit, style]);
  useEffect(() => () => offenseMats.dispose(), [offenseMats]);
  useEffect(() => () => defenseMats.dispose(), [defenseMats]);

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
          style={style}
          seed={i * 7 + (p.player?.number ?? i)}
        />
      ))}
    </group>
  );
}
