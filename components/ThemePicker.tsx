"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

const THEMES = [
  { value: "paper", label: "Papier" },
  { value: "night", label: "Noc" },
  { value: "ocean", label: "Ocean" },
  { value: "forest", label: "Las" },
  { value: "plum", label: "Śliwka" },
] as const;

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState("paper");

  useEffect(() => {
    queueMicrotask(() => setTheme(document.documentElement.dataset.theme ?? "paper"));
  }, []);

  function changeTheme(value: string) {
    document.documentElement.dataset.theme = value;
    localStorage.setItem("szeruj-theme", value);
    setTheme(value);
  }

  return (
    <label className={`theme-picker ${compact ? "theme-picker-compact" : ""}`}>
      <Palette size={16} aria-hidden="true" />
      <span className="sr-only">Motyw kolorystyczny</span>
      <select value={theme} onChange={(event) => changeTheme(event.target.value)}>
        {THEMES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}
