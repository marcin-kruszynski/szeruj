export const THEME_STORAGE_KEY = "szeruj-theme";

export const THEMES = [
  { value: "paper", label: "Papier", mode: "light" },
  { value: "dawn", label: "Poranek", mode: "light" },
  { value: "ocean", label: "Laguna", mode: "light" },
  { value: "forest", label: "Łąka", mode: "light" },
  { value: "plum", label: "Lawenda", mode: "light" },
  { value: "night", label: "Noc", mode: "dark" },
  { value: "abyss", label: "Głębia", mode: "dark" },
  { value: "pine", label: "Bór", mode: "dark" },
  { value: "wine", label: "Wino", mode: "dark" },
  { value: "graphite", label: "Grafit", mode: "dark" },
] as const;

export type ThemeId = (typeof THEMES)[number]["value"];
export type ThemeMode = (typeof THEMES)[number]["mode"];

export const DEFAULT_LIGHT_THEME: ThemeId = "paper";
export const DEFAULT_DARK_THEME: ThemeId = "night";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((theme) => theme.value === value);
}
