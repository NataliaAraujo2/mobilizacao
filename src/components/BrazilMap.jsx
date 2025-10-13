import React, { useEffect, useRef } from "react";
import styles from "../styles/BrazilMap.module.css";
import brasilMap from "../assets/brasil-map.svg?raw";

const BrazilMap = ({ onSelectState, selectedState, disabled }) => {
  const mapRef = useRef(null);

  // toda vez que selectedState mudar, aplica a classe de destaque
  useEffect(() => {
    if (!mapRef.current) return;

    // remove destaque anterior
    const prev = mapRef.current.querySelector(`.estado.${styles.active}`);
    if (prev) prev.classList.remove(styles.active);

    // adiciona destaque no estado selecionado
    if (selectedState) {
      const el =
        mapRef.current.querySelector(`.estado[name="${selectedState}"]`) ||
        mapRef.current.querySelector(`.estado[id="${selectedState}"]`);
      if (el) el.classList.add(styles.active);
    }
  }, [selectedState]);

  const handleClick = (ev) => {
  // Captura o elemento clicado
  let el = ev.target;

  // Se for um <path> dentro de um <a>, sobe até o <a>
  if (el.tagName.toLowerCase() === "path" || el.tagName.toLowerCase() === "text") {
    el = el.closest("a.estado");
  }

  // Se estiver desabilitado, não faz nada
  if (disabled) return;

  // Agora sim, pega o nome do estado
  if (el && el.classList.contains("estado")) {
    const uf = el.getAttribute("name") || el.getAttribute("id");
    if (uf && onSelectState) {
      onSelectState(uf);
    }
  }
};

  return (
    <div
      ref={mapRef}
      className={styles.mapWrapper}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: brasilMap }}
    />
  );
};

export default BrazilMap;
