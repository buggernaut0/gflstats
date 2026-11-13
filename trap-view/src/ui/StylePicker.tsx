import { STYLE_ORDER, STYLES } from '../players/styles';
import { useTrapView } from '../state/store';

/** Umschalter für den Darstellungsstil der Spieler – wirkt sofort, auch während der Präsentation. */
export function StylePicker({ compact = false }: { compact?: boolean }) {
  const style = useTrapView((s) => s.modelStyle);
  const setStyle = useTrapView((s) => s.setModelStyle);
  return (
    <div className={`tv-styles${compact ? ' tv-styles--compact' : ''}`} role="group" aria-label="Spielermodell">
      {!compact && <span className="tv-styles__head">Spielermodell</span>}
      {STYLE_ORDER.map((k) => (
        <button
          key={k}
          className={`tv-style${k === style ? ' is-active' : ''}`}
          aria-pressed={k === style}
          title={STYLES[k].hint}
          onClick={() => setStyle(k)}
        >
          {STYLES[k].label}
        </button>
      ))}
    </div>
  );
}
