"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // pas grave si ça échoue (ex: en dev sur certains navigateurs) — le mode hors ligne
        // reposera alors uniquement sur IndexedDB, sans cache de la coquille applicative.
      });
    }
  }, []);
  return null;
}
