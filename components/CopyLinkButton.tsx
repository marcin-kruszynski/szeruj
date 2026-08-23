"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export function CopyLinkButton({ url, compact = false }: { url?: string; compact?: boolean }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    const value = url ?? window.location.href;
    try {
      await copyText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  const label = status === "copied" ? "Skopiowano" : status === "error" ? "Nie udało się" : "Kopiuj link";

  return (
    <button
      className={`button button-primary ${compact ? "button-small" : ""} ${status === "error" ? "is-error" : ""}`}
      type="button"
      onClick={copy}
      aria-label={label}
      title={status === "idle" ? "Kopiuj publiczny link" : undefined}
    >
      {status === "copied" ? <Check size={17} /> : status === "error" ? <TriangleAlert size={17} /> : <Copy size={17} />}
      <span aria-live="polite">{label}</span>
    </button>
  );
}
