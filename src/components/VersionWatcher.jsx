import { useEffect } from "react";

const STORAGE_KEY = "mobilizacao.deployment-version";

export default function VersionWatcher() {
  useEffect(() => {
    let checking = false;
    async function checkVersion() {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const { version } = await response.json();
        const previous = sessionStorage.getItem(STORAGE_KEY);
        if (previous && previous !== String(version)) {
          sessionStorage.setItem(STORAGE_KEY, String(version));
          window.location.reload();
          return;
        }
        sessionStorage.setItem(STORAGE_KEY, String(version));
      } catch {
        // A página continua disponível mesmo se a rede estiver instável.
      } finally { checking = false; }
    }
    checkVersion();
    function onVisibilityChange() { if (!document.hidden) checkVersion(); }
    window.addEventListener("focus", checkVersion);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", checkVersion);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  return null;
}
