import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Wait for the lazy-loaded home before resolving an anchor, including direct URLs.
export default function SectionScroll() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (pathname !== "/" || !hash) return undefined;
    const id = hash.slice(1);
    let frame;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new MutationObserver(scroll);
    function scroll() {
      const target = document.getElementById(id);
      if (!target) return;
      observer.disconnect();
      frame = window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start", behavior: reducedMotion ? "instant" : "smooth" });
      });
    }
    observer.observe(document.body, { childList: true, subtree: true });
    scroll();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [pathname, hash, key]);
  return null;
}
