const intFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const oneFmt = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 1663 -> "1.663"; 2.5 -> "2,5"; Halbe (Sacks, Tackles) behalten eine Nachkommastelle. */
export function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return Number.isInteger(value) ? intFmt.format(value) : oneFmt.format(value);
}

/** Feste Nachkommastellen, z. B. fuer Durchschnittswerte. */
export function fmtDec(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function fmtSigned(value: number): string {
  if (value === 0) return "0";
  return (value > 0 ? "+" : "−") + intFmt.format(Math.abs(value));
}

const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

export const fmtDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

/** Zeitpunkt (ISO mit Zeitzone) als deutsches Datum in Berliner Zeit. */
const stampFmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
export const fmtStamp = (isoDateTime: string) => stampFmt.format(new Date(isoDateTime));
export const fmtShortDate = (iso: string) => shortDateFmt.format(new Date(`${iso}T00:00:00Z`));
