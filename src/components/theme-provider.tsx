"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * In-house theme provider (replaces next-themes). Same observable behavior —
 * class attribute on <html>, system tracking, localStorage("theme"), no
 * transition flash on toggle — but the no-FOUC bootstrap script lives as
 * STATIC server HTML in the root layout instead of a React-rendered <script>,
 * which React 19.2 flags with "Encountered a script tag while rendering".
 */

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const STORAGE_KEY = "theme"; // next-themes' default — existing prefs carry over
const THEMES: Theme[] = ["light", "dark", "system"];

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Concrete light/dark; undefined until mounted (matches next-themes). */
  resolvedTheme: Resolved | undefined;
  systemTheme: Resolved | undefined;
  themes: Theme[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyResolved(resolved: Resolved, suppressTransitions: boolean) {
  const d = document.documentElement;
  let cleanup: (() => void) | null = null;
  if (suppressTransitions) {
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{transition:none !important}",
      ),
    );
    document.head.appendChild(style);
    cleanup = () => {
      // Force a reflow so the no-transition rule applies before removal.
      window.getComputedStyle(document.body);
      requestAnimationFrame(() => style.remove());
    };
  }
  d.classList.remove("light", "dark");
  d.classList.add(resolved);
  d.style.colorScheme = resolved;
  cleanup?.();
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange = true,
}: {
  children: React.ReactNode;
  /** Accepted for layout compatibility — only "class" behavior is implemented. */
  attribute?: "class";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<Resolved | undefined>(
    undefined,
  );

  // Sync from storage + system after mount (the bootstrap script has already
  // painted the right class, so there is no flash).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && THEMES.includes(stored)) setThemeState(stored);
    } catch {
      // Storage unavailable — stay on the default.
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mq.matches ? "dark" : "light");
    const onChange = () => setSystemTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);

    // Cross-tab sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = (e.newValue as Theme | null) ?? defaultTheme;
      if (THEMES.includes(next)) setThemeState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [defaultTheme]);

  const resolvedTheme: Resolved | undefined =
    theme === "system" ? systemTheme : theme;

  // Keep <html> in step whenever the resolved theme changes.
  useEffect(() => {
    if (!resolvedTheme) return;
    applyResolved(resolvedTheme, disableTransitionOnChange);
  }, [resolvedTheme, disableTransitionOnChange]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't persist.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, resolvedTheme, systemTheme, themes: THEMES }),
    [theme, setTheme, resolvedTheme, systemTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
