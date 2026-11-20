"use client";

import { useI18n } from "@/i18n/react";

/** Datenquelle und Datenstand in der Fußzeile, in der gewählten Sprache. */
export default function FooterData({ from, to, builtAt }: { from: number; to: number; builtAt: string }) {
  const { m, fmtStamp } = useI18n();
  return <p>{m.shell.footerData(from, to, fmtStamp(builtAt))}</p>;
}
