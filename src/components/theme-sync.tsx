"use client";

import { useEffect } from "react";
import { applyTheme, readTheme } from "@/components/theme";

export function ThemeSync() {
  useEffect(() => {
    applyTheme(readTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyTheme(readTheme());
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return null;
}
