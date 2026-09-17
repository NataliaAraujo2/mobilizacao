import React, { useEffect, useRef } from "react";
import styles from "./BrazilMap.module.css";
import brasilMap from "../../assets/brasil-map.svg?raw";
import { BRAZIL_STATE_BY_CODE, BRAZIL_STATE_BY_NORMALIZED_NAME, normalizeBrazilStateName } from "../../domain/locations/brazilStates";

const BrazilMap = ({
  onSelectState,
  selectedState,
  disabled,
  onMouseEnter,
  onMouseLeave,
}) => {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const prev = mapRef.current.querySelector(`.estado.${styles.active}`);
    if (prev) prev.classList.remove(styles.active);

    const selectedStateName = BRAZIL_STATE_BY_CODE[selectedState]?.name;
    if (selectedStateName) {
      const el =
        mapRef.current.querySelector(`.estado[name="${selectedStateName}"]`) ||
        mapRef.current.querySelector(`.estado[id="${selectedStateName}"]`);
      if (el) el.classList.add(styles.active);
    }
  }, [selectedState]);

  useEffect(() => {
    const pernambuco = mapRef.current?.querySelector('a.estado[name="Pernambuco"]');
    if (!pernambuco?.parentNode) return undefined;

    let originalPosition;
    const bringToFront = () => {
      if (originalPosition) return;
      originalPosition = { parent: pernambuco.parentNode, next: pernambuco.nextSibling };
      pernambuco.parentNode.appendChild(pernambuco);
    };
    const restorePosition = () => {
      if (!originalPosition) return;
      const { parent, next } = originalPosition;
      if (next?.parentNode === parent) parent.insertBefore(pernambuco, next);
      else parent.appendChild(pernambuco);
      originalPosition = undefined;
    };

    pernambuco.addEventListener("pointerenter", bringToFront);
    pernambuco.addEventListener("pointerleave", restorePosition);
    return () => {
      pernambuco.removeEventListener("pointerenter", bringToFront);
      pernambuco.removeEventListener("pointerleave", restorePosition);
      restorePosition();
    };
  }, []);

  const handleClick = (event) => {
    let element = event.target;
    if (["path", "text"].includes(element.tagName.toLowerCase())) element = element.closest("a.estado");
    if (disabled || !element?.classList.contains("estado")) return;

    const stateName = element.getAttribute("name") || element.getAttribute("id");
    const stateCode = BRAZIL_STATE_BY_NORMALIZED_NAME[normalizeBrazilStateName(stateName)]?.code;
    if (stateCode && onSelectState) onSelectState(stateCode);
  };

  return (
    <div
      ref={mapRef}
      className={styles.mapWrapper}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-disabled={disabled}
      dangerouslySetInnerHTML={{ __html: brasilMap }}
    />
  );
};

export default BrazilMap;
