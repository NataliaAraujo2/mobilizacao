import { useEffect, useRef } from "react";
import mapSvg from "../../assets/brasil-map.svg?raw";
import { BRAZIL_STATE_BY_NORMALIZED_NAME, normalizeBrazilStateName } from "../../domain/locations/brazilStates";
import styles from "./BrazilMap.module.css";

export default function BrazilMap({ selectedState, onSelectState, disabled = false }) {
  const mapRef = useRef(null);

  useEffect(() => {
    const mapElement = mapRef.current;
    const states = mapElement?.querySelectorAll("a.estado") ?? [];

    states.forEach((state) => {
      const name = state.getAttribute("name");
      const code = BRAZIL_STATE_BY_NORMALIZED_NAME[normalizeBrazilStateName(name)]?.code;
      const isSelected = code === selectedState;
      if (!code) return;

      state.setAttribute("data-state", code);
      state.setAttribute("href", "#");
      state.setAttribute("role", "button");
      state.setAttribute("tabindex", disabled ? "-1" : "0");
      state.setAttribute("aria-label", `Selecionar ${name}`);
      state.setAttribute("aria-pressed", String(isSelected));
      state.classList.toggle(styles.selected, isSelected);
    });

    const activateState = (event) => {
      const state = event.target.closest?.("a.estado");
      if (!state || disabled || (event.type === "keydown" && event.key !== "Enter" && event.key !== " ")) return;
      const code = BRAZIL_STATE_BY_NORMALIZED_NAME[normalizeBrazilStateName(state.getAttribute("name"))]?.code;
      if (!code) return;
      event.preventDefault();
      onSelectState?.(code);
    };

    mapElement?.addEventListener("click", activateState);
    mapElement?.addEventListener("keydown", activateState);
    const originalPositions = new Map();
    const elevateState = (event) => {
      const state = event.currentTarget;
      if (!state.parentNode || originalPositions.has(state)) return;
      originalPositions.set(state, { parent: state.parentNode, next: state.nextSibling });
      state.parentNode.appendChild(state);
    };
    const restoreState = (event) => {
      const state = event.currentTarget;
      const position = originalPositions.get(state);
      if (!position) return;
      if (position.next?.parentNode === position.parent) position.parent.insertBefore(state, position.next);
      else position.parent.appendChild(state);
      originalPositions.delete(state);
    };
    states.forEach((state) => {
      state.addEventListener("pointerenter", elevateState);
      state.addEventListener("pointerleave", restoreState);
    });

    return () => {
      mapElement?.removeEventListener("click", activateState);
      mapElement?.removeEventListener("keydown", activateState);
      states.forEach((state) => {
        state.removeEventListener("pointerenter", elevateState);
        state.removeEventListener("pointerleave", restoreState);
      });
    };
  }, [disabled, onSelectState, selectedState]);

  return (
    <div
      ref={mapRef}
      className={styles.map}
      aria-label="Mapa interativo do Brasil"
      aria-disabled={disabled}
      dangerouslySetInnerHTML={{ __html: mapSvg }}
    />
  );
}
