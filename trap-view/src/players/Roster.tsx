import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { SceneModel } from '../data/sceneModel';
import { createSquad } from './squad';

/** Alle Spieler der Partie – ein gemeinsames Modell, instanziert (siehe squad.ts). */
export function Roster({ model, animate = true }: { model: SceneModel; animate?: boolean }) {
  const squad = useMemo(() => createSquad(model), [model]);
  useEffect(() => () => squad.dispose(), [squad]);
  useFrame(({ clock }) => {
    if (animate) squad.update(clock.elapsedTime);
  });
  return <primitive object={squad.group} />;
}
