export const THEME_KEY = "modernlms-theme";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_INIT_SCRIPT = `(function(){
  try {
    var t = localStorage.getItem("${THEME_KEY}") || "system";
    var dark = t === "dark" || (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();`;

export function readTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

export function themeIsDark(theme: ThemePreference) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: ThemePreference) {
  const dark = themeIsDark(theme);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function persistTheme(theme: ThemePreference) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
