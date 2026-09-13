import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./AdminInstall.module.css";

export default function AdminInstall() {
  const { pathname } = useLocation();
  const active = pathname === "/admin" || pathname.startsWith("/admin/");
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!active) return;
    const beforeInstall = event => { event.preventDefault(); setPrompt(event); };
    const afterInstall = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", afterInstall);
    const link = document.createElement("link");
    link.rel = "manifest"; link.href = "/admin/manifest.webmanifest"; document.head.appendChild(link);
    return () => {
      link.remove(); setPrompt(null);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", afterInstall);
    };
  }, [active]);
  if (!active || installed) return null;
  async function install() {
    if (!prompt) {
      setMessage("No Chrome ou Edge, use a opção de instalar aplicativo na barra de endereço ou no menu do navegador. Se ela não aparecer, recarregue esta página. A disponibilidade depende do navegador.");
      return;
    }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null);
      if (choice.outcome === "dismissed") setMessage("Instalação cancelada. Você pode tentar novamente pelo menu do navegador.");
    } catch { setPrompt(null); setMessage("Não foi possível abrir a instalação. Tente pelo menu do navegador."); }
  }
  return <aside className={styles.panel} aria-label="Instalação do aplicativo">
    <div><strong>MobilizAÇÃO — Minha área</strong><p>Use em uma janela própria no computador. Requer internet e login.</p></div>
    <button type="button" onClick={install}>Instalar aplicativo</button>
    {message && <p className={styles.message} role="status">{message}</p>}
  </aside>;
}
