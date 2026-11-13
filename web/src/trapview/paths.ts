/**
 * Adressen der Trap View innerhalb der Website. NEXT_PUBLIC_BASE_PATH ist der Unterpfad der Website
 * (z. B. /gflstats auf GitHub Pages, sonst leer); die Trap-View-Dateien liegen unter public/trapview/.
 */
export const SITE_BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
export const ASSET_BASE = `${SITE_BASE}/trapview`;
