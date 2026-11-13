import type { ReactNode } from 'react';
import type { SceneModel, ScenePlayer } from '../data/sceneModel';
import type { Side } from '../data/types';

function Column({ model, side }: { model: SceneModel; side: Side }) {
  const team = side === 'offense' ? model.offense : model.defense;
  const players = model.players.filter((p) => p.side === side);
  const row = (p: ScenePlayer) => (
    <li key={p.id} className={p.player ? undefined : 'is-empty'}>
      <span className="tv-board__num">{p.player?.number ?? '–'}</span>
      <span className="tv-board__pos">{p.posLabel}</span>
      <span className="tv-board__name">{p.player?.name ?? 'nicht belegt'}</span>
    </li>
  );
  return (
    <section className="tv-board__col" style={{ ['--accent' as string]: side === 'offense' ? team.colors.accent : team.colors.secondary }}>
      <h3>
        <small>{side === 'offense' ? 'Starting Offense' : 'Starting Defense'}</small>
        {team.name}
      </h3>
      <ol>{players.map(row)}</ol>
    </section>
  );
}

/**
 * Die Aufstellung beider Teams als Text.
 * - Ersatz für die 3D-Szene, wenn WebGL nicht verfügbar ist oder ausfällt (`notice` erklärt warum).
 * - Unsichtbar (`srOnly`) neben der laufenden 3D-Szene, damit Screenreader denselben Inhalt bekommen.
 */
export function LineupBoard({ model, srOnly = false, notice }: { model: SceneModel; srOnly?: boolean; notice?: ReactNode }) {
  return (
    <div className={srOnly ? 'tv-sr' : 'tv-board'} role="region" aria-label={`Aufstellung ${model.offense.name} gegen ${model.defense.name}`}>
      {notice && <div className="tv-board__note" role="status">{notice}</div>}
      <div className="tv-board__cols">
        <Column model={model} side="offense" />
        <Column model={model} side="defense" />
      </div>
    </div>
  );
}
