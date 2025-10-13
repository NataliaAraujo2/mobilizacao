// src/hooks/useScrollToHash.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook para rolar suavemente até qualquer âncora presente na URL.
 * Funciona ao entrar na página ou quando muda o hash.
 */
export function useScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);

      if (element) {
        // Timeout garante que o DOM já tenha sido renderizado
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          element.focus({ preventScroll: true }); // acessibilidade: foco no conteúdo
        }, 100);
      }
    } else {
      // Se não houver hash, rola para o topo da página
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [hash]);
}
