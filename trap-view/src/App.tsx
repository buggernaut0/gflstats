import { TrapView } from './TrapView';
import { sampleData } from './data/sampleData';

/** Demo-Hülle des Prototyps. In GFL Analytics wird <TrapView /> direkt eingebunden. */
export function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <TrapView data={sampleData} />
    </div>
  );
}
