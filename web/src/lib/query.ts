/**
 * Kombinierbare Bedingungen fuer die Suchen: "Kennzahl Operator Wert", verknuepft mit UND oder ODER.
 * Wird in der Adresse gespeichert (?c=receivingyards:gte:200~touchdowncatch:gte:1&l=and), damit
 * jede Abfrage als Link teilbar ist.
 */

export type Op = "gte" | "lte" | "gt" | "lt" | "eq" | "between";

export const OPS: { value: Op; label: string }[] = [
  { value: "gte", label: "mindestens" },
  { value: "lte", label: "höchstens" },
  { value: "gt", label: "mehr als" },
  { value: "lt", label: "weniger als" },
  { value: "eq", label: "genau" },
  { value: "between", label: "zwischen" },
];

export interface Condition {
  stat: string;
  op: Op;
  a: number;
  b?: number;
}

export type Logic = "and" | "or";

/** Vollstaendig ausgefuellte Bedingung? Unfertige (ohne Kennzahl oder Wert) werden beim Filtern ignoriert. */
export function isComplete(c: Condition): boolean {
  return !!c.stat && Number.isFinite(c.a) && (c.op !== "between" || c.b === undefined || Number.isFinite(c.b));
}

export function testCondition(c: Condition, x: number | null): boolean {
  if (x === null || Number.isNaN(x)) return false;
  switch (c.op) {
    case "gte": return x >= c.a;
    case "lte": return x <= c.a;
    case "gt": return x > c.a;
    case "lt": return x < c.a;
    case "eq": return x === c.a;
    case "between": return x >= Math.min(c.a, c.b ?? c.a) && x <= Math.max(c.a, c.b ?? c.a);
  }
}

/** Alle Bedingungen (UND) oder mindestens eine (ODER). Keine Bedingung = alles passt; unfertige zaehlen nicht. */
export function matches(all: Condition[], logic: Logic, get: (stat: string) => number | null): boolean {
  const conds = all.filter(isComplete);
  if (!conds.length) return true;
  return logic === "and" ? conds.every((c) => testCondition(c, get(c.stat))) : conds.some((c) => testCondition(c, get(c.stat)));
}

export function encodeConditions(conds: Condition[]): string {
  return conds.filter(isComplete).map((c) => [c.stat, c.op, c.a, c.op === "between" ? c.b ?? c.a : null].filter((x) => x !== null).join(":")).join("~");
}

export function decodeConditions(s: string | null, valid: (stat: string) => boolean): Condition[] {
  if (!s) return [];
  return s
    .split("~")
    .map((part) => {
      const [stat, op, a, b] = part.split(":");
      const c: Condition = { stat, op: op as Op, a: Number(a) };
      if (b !== undefined) c.b = Number(b);
      return c;
    })
    .filter((c) => valid(c.stat) && OPS.some((o) => o.value === c.op) && Number.isFinite(c.a));
}

export function describe(c: Condition, label: string): string {
  const op = OPS.find((o) => o.value === c.op)!.label;
  return c.op === "between" ? `${label} zwischen ${c.a} und ${c.b ?? c.a}` : `${label} ${op} ${c.a}`;
}
