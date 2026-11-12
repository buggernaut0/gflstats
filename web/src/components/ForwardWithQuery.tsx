"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Leitet eine fruehere Adresse auf ihre neue Seite weiter und behaelt dabei alle Suchparameter.
 * Statischer Export kennt keine Server-Weiterleitungen, deshalb geschieht das im Browser.
 */
export default function ForwardWithQuery({ to, add = {} }: { to: string; add?: Record<string, string> }) {
  const router = useRouter();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(add)) if (!q.has(k)) q.set(k, v);
    router.replace(`${to}?${q.toString()}`);
  }, [router, to, add]);
  return null;
}
