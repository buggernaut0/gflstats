"use client";

import { useEffect, useRef } from "react";
import { OPS, type Condition, type Logic, type Op } from "@/lib/query";

export interface StatOption {
  key: string;
  label: string;
  group: string;
}

/** Auswahlliste fuer Kennzahlen, nach Bereich gruppiert. */
export function StatSelect({ value, onChange, options, label = "Kennzahl", className = "", placeholder }: { value: string; onChange: (v: string) => void; options: StatOption[]; label?: string; className?: string; placeholder?: string }) {
  const groups = [...new Set(options.map((o) => o.group))];
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`h-9 rounded-md border border-line bg-surface px-2 text-[14px] ${value ? "text-ink" : "text-ink-3"} ${className}`}>
      {placeholder !== undefined && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {options
            .filter((o) => o.group === g)
            .map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Bedingungs-Baukasten: beliebig viele "Kennzahl Operator Wert", verknuepft mit UND oder ODER. */
export default function QueryBuilder({
  conditions,
  logic,
  options,
  onChange,
  defaultStat,
  framed = true,
  allowOr = true,
  draft = false,
}: {
  conditions: Condition[];
  logic: Logic;
  options: StatOption[];
  onChange: (conds: Condition[], logic: Logic) => void;
  defaultStat: string;
  /** false: ohne eigenen Rahmen, wenn der Baukasten in einem bestehenden Bereich sitzt */
  framed?: boolean;
  /** false: Bedingungen immer mit UND verknuepft, ohne Umschalter */
  allowOr?: boolean;
  /**
   * true: Neue Zeilen starten ohne Kennzahl und ohne Wert ("Statistik waehlen ..."); ohne Bedingung steht
   * direkt eine solche leere Zeile da. Unfertige Zeilen filtern nicht (isComplete in lib/query).
   */
  draft?: boolean;
}) {
  const set = (i: number, patch: Partial<Condition>) => onChange(conditions.map((c, k) => (k === i ? { ...c, ...patch } : c)), logic);
  const rows = draft && conditions.length === 0 ? [{ stat: "", op: "gte" as Op, a: NaN }] : conditions;
  const setRow = (i: number, patch: Partial<Condition>) => (conditions.length === 0 ? onChange([{ ...rows[0], ...patch }], logic) : set(i, patch));
  // Nach Wahl einer Kennzahl in einer leeren Zeile springt der Fokus ins Wertfeld
  const focusValue = useRef<number | null>(null);
  const valueRefs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if (focusValue.current !== null) valueRefs.current[focusValue.current]?.focus();
    focusValue.current = null;
  });
  const num = (v: string) => (v === "" ? NaN : Number(v));
  const joiner = allowOr ? (logic === "and" ? "UND" : "ODER") : "UND";
  return (
    <fieldset className={framed ? "rounded-xl border border-line bg-surface p-4" : "min-w-0"}>
      <legend className={framed ? "px-1 text-[13px] font-medium text-ink-2" : "sr-only"}>Bedingungen</legend>
      {allowOr && conditions.length > 1 && (
        <div role="radiogroup" aria-label="Verknüpfung" className="mb-3 flex items-center gap-2 text-[13.5px] text-ink-2">
          Treffer erfüllen
          {(["and", "or"] as Logic[]).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={logic === l}
              onClick={() => onChange(conditions, l)}
              className={`rounded-md border px-2.5 py-1 ${logic === l ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-2 hover:text-ink"}`}
            >
              {l === "and" ? "alle (UND)" : "mindestens eine (ODER)"}
            </button>
          ))}
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {rows.map((c, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            {rows.length > 1 && <span className="w-10 text-[12px] font-semibold text-ink-3">{i === 0 ? "" : joiner}</span>}
            <StatSelect
              value={c.stat}
              onChange={(v) => {
                if (draft && !c.stat) focusValue.current = i;
                setRow(i, { stat: v });
              }}
              options={options}
              placeholder={draft ? "Statistik wählen …" : undefined}
              className="w-full min-w-0 sm:w-auto sm:min-w-[260px]"
            />
            <select aria-label="Vergleich" value={c.op} onChange={(e) => setRow(i, { op: e.target.value as Op })} className="h-9 rounded-md border border-line bg-surface px-2 text-[14px] text-ink">
              {OPS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              ref={(el) => {
                valueRefs.current[i] = el;
              }}
              aria-label="Wert"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="Wert"
              value={Number.isFinite(c.a) ? c.a : ""}
              onChange={(e) => setRow(i, { a: num(e.target.value) })}
              className="num h-9 w-24 rounded-md border border-line bg-surface px-2 text-[14px] text-ink placeholder:text-ink-3"
            />
            {c.op === "between" && (
              <>
                <span className="text-[13px] text-ink-3">und</span>
                <input aria-label="Obergrenze" type="number" step="any" inputMode="decimal" placeholder="Wert" value={c.b !== undefined && Number.isFinite(c.b) ? c.b : ""} onChange={(e) => setRow(i, { b: num(e.target.value) })} className="num h-9 w-24 rounded-md border border-line bg-surface px-2 text-[14px] text-ink placeholder:text-ink-3" />
              </>
            )}
            {i < conditions.length && (
              <button type="button" onClick={() => onChange(conditions.filter((_, k) => k !== i), logic)} aria-label="Bedingung entfernen" title="Bedingung entfernen" className="grid h-9 w-9 place-items-center rounded-md text-[18px] text-ink-3 hover:bg-surface-2 hover:text-ink">
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {(!draft || conditions.length > 0) && (
        <button type="button" onClick={() => onChange([...conditions, draft ? { stat: "", op: "gte", a: NaN } : { stat: defaultStat, op: "gte", a: 0 }], logic)} className="mt-3 rounded-md border border-dashed border-line-strong px-3 py-1.5 text-[13.5px] text-ink-2 hover:text-ink">
          + Bedingung hinzufügen
        </button>
      )}
    </fieldset>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">
      {label}
      {children}
    </label>
  );
}

export const selectCls = "h-9 rounded-md border border-line bg-surface px-2 text-[14px] text-ink";
export const inputCls = "h-9 rounded-md border border-line bg-surface px-2.5 text-[14px] text-ink placeholder:text-ink-3";
