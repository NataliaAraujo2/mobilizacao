import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./AdminInstall.module.css";

function isInstalledApp() {
  return ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"]
    .some(mode => window.matchMedia(`(display-mode: ${mode})`).matches)
    || window.navigator.standalone === true
    || document.referrer.startsWith("android-app://");
}

export default function AdminInstall() {
  const { pathname } = useLocation();
  const active = pathname === "/admin" || pathname.startsWith("/admin/");
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(isInstalledApp);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!active) return;
    const refreshInstallState = () => setInstalled(isInstalledApp());
    const beforeInstall = event => {
      event.preventDefault();
      setPrompt(event);
      setMessage("");
    };
    const afterInstall = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", afterInstall);
    window.addEventListener("focus", refreshInstallState);
    refreshInstallState();
    const link = document.createElement("link");
    link.rel = "manifest"; link.href = "/admin/manifest.webmanifest"; document.head.appendChild(link);
    return () => {
      link.remove(); setPrompt(null);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", afterInstall);
      window.removeEventListener("focus", refreshInstallState);
    };
  }, [active]);
  // O navegador só expõe o prompt quando a instalação é realmente possível.
  // Sem ele (inclusive em uma PWA já instalada), não mostramos um botão enganoso.
  if (!active || installed || !prompt) return null;
  async function install() {
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null);
      if (choice.outcome === "dismissed") setMessage("Instalação cancelada. Você pode tentar novamente pelo menu do navegador.");
    } catch { setPrompt(null); setMessage("Não foi possível abrir a instalação. Tente pelo menu do navegador."); }
  }
  return <div className={styles.control} aria-label="Instalação do aplicativo">
    <button type="button" onClick={install}>Instalar app</button>
    {message && <p className={styles.message} role="status">{message}</p>}
  </div>;
}
