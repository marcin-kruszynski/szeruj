"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  isThemeId,
  THEMES,
  THEME_STORAGE_KEY,
  type ThemeId,
  type ThemeMode,
} from "@/lib/themes";

function preferredTheme(): ThemeId {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DEFAULT_DARK_THEME
    : DEFAULT_LIGHT_THEME;
}

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_LIGHT_THEME);

  useEffect(() => {
    function applyTheme(value: string | null | undefined) {
      const nextTheme = isThemeId(value) ? value : preferredTheme();
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
    }

    queueMicrotask(() => applyTheme(document.documentElement.dataset.theme));
    function syncTheme(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY) applyTheme(event.newValue);
    }
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  function changeTheme(value: string) {
    if (!isThemeId(value)) return;
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // The current page can still use the theme when browser storage is blocked.
    }
    setTheme(value);
  }

  return (
    <label className={`theme-picker ${compact ? "theme-picker-compact" : ""}`}>
      <Palette size={16} aria-hidden="true" />
      <span className="sr-only">Motyw kolorystyczny</span>
      <select
        aria-label="Motyw kolorystyczny"
        value={theme}
        onChange={(event) => changeTheme(event.target.value)}
      >
        {(["light", "dark"] as const satisfies readonly ThemeMode[]).map((mode) => (
          <optgroup key={mode} label={mode === "light" ? "Jasne" : "Ciemne"}>
            {THEMES.filter((item) => item.mode === mode).map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
