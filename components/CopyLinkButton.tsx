"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export function CopyLinkButton({ url, compact = false }: { url?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const value = url ?? window.location.href;
    try {
      await copyText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className={`button button-primary ${compact ? "button-small" : ""}`} type="button" onClick={copy}>
      {copied ? <Check size={17} /> : <Copy size={17} />}
      {copied ? "Skopiowano" : "Kopiuj link"}
    </button>
  );
}
