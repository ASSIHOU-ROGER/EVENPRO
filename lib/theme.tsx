"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";

type ThemeContextValue = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
};

const STORAGE_KEY = "eventpro-dark-mode";

const ThemeContext = createContext<ThemeContextValue>({
  darkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
});

function applyClass(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [darkMode, setDarkModeState] = useState(false);

  // Lecture initiale côté client (le script inline dans <head> a déjà appliqué la classe
  // avant l'hydratation pour éviter le flash visuel) — on synchronise juste l'état React.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setDarkModeState(stored === "true");
  }, []);

  // Une fois connecté, la préférence enregistrée sur le compte (table profiles) fait foi —
  // utile si l'utilisateur a activé le mode nuit sur un autre appareil.
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("dark_mode")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof data.dark_mode === "boolean") {
          setDarkModeState(data.dark_mode);
          window.localStorage.setItem(STORAGE_KEY, String(data.dark_mode));
        }
      });
  }, [user]);

  useEffect(() => {
    applyClass(darkMode);
  }, [darkMode]);

  const setDarkMode = useCallback(
    (value: boolean) => {
      setDarkModeState(value);
      window.localStorage.setItem(STORAGE_KEY, String(value));
      if (user) {
        const supabase = createClient();
        supabase.from("profiles").update({ dark_mode: value }).eq("id", user.id).then();
      }
    },
    [user]
  );

  const toggleDarkMode = useCallback(() => setDarkMode(!darkMode), [darkMode, setDarkMode]);

  return <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
