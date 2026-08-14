"use client";

import { Check, Code2, Copy, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { copyText } from "@/lib/clipboard";

const LANGUAGE_NAMES: Record<string, string> = {
  bash: "Bash",
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  markdown: "Markdown",
  md: "Markdown",
  plaintext: "Tekst",
  python: "Python",
  py: "Python",
  shell: "Shell",
  sh: "Shell",
  sql: "SQL",
  text: "Tekst",
  txt: "Tekst",
  ts: "TypeScript",
  tsx: "TSX",
  yaml: "YAML",
  yml: "YAML",
};

export function MarkdownCodeBlock({
  children,
  code,
  language,
}: {
  children: ReactNode;
  code: string;
  language?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const label = language ? LANGUAGE_NAMES[language.toLowerCase()] ?? language : "Kod";

  async function copy() {
    try {
      await copyText(code);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-toolbar">
        <span><Code2 size={14} aria-hidden="true" />{label}</span>
        <button
          type="button"
          onClick={copy}
          className={status !== "idle" ? `is-${status}` : undefined}
          aria-label={`Kopiuj blok: ${label}`}
        >
          {status === "copied" ? <Check size={14} /> : status === "error" ? <TriangleAlert size={14} /> : <Copy size={14} />}
          <span aria-live="polite">
            {status === "copied" ? "Skopiowano" : status === "error" ? "Nie udało się" : "Kopiuj"}
          </span>
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}
