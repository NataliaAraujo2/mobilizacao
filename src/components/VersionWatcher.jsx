import { useEffect, useState } from "react";
import styles from "./VersionWatcher.module.css";

const STORAGE_KEY = "mobilizacao.deployment-version";

export default function VersionWatcher() {
  const [availableVersion, setAvailableVersion] = useState(null);
  useEffect(() => {
    let checking = false;
    let active = true;
    let currentVersion = null;
    try { currentVersion = sessionStorage.getItem(STORAGE_KEY); } catch { /* Storage pode estar indisponível. */ }
    const controller = new AbortController();
    async function checkVersion() {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const { version } = await response.json();
        if (!active || !["string", "number"].includes(typeof version) || !String(version).trim()) return;
        const nextVersion = String(version);
        if (currentVersion && currentVersion !== nextVersion) {
          setAvailableVersion(nextVersion);
          return;
        }
        currentVersion = nextVersion;
        setAvailableVersion(null);
        try { sessionStorage.setItem(STORAGE_KEY, nextVersion); } catch { /* Mantém a referência em memória. */ }
      } catch {
        // A página continua disponível mesmo se a rede estiver instável.
      } finally { checking = false; }
    }
    checkVersion();
    function onVisibilityChange() { if (!document.hidden) checkVersion(); }
    window.addEventListener("focus", checkVersion);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("focus", checkVersion);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  function updateNow() {
    if (!window.confirm("Atualizar a página agora? Alterações e respostas ainda não salvas serão perdidas. Para continuar preenchendo, clique em Cancelar.")) return;
    try { sessionStorage.setItem(STORAGE_KEY, availableVersion); } catch { /* Atualizar funciona mesmo sem storage. */ }
    window.location.reload();
  }
  if (!availableVersion) return null;
  return <aside className={styles.banner} aria-label="Atualização do site">
    <div role="status"><strong>Nova versão disponível</strong><p>Você pode continuar usando esta página. Salve suas alterações antes de atualizar.</p></div>
    <button type="button" onClick={updateNow}>Atualizar agora</button>
  </aside>;
}
