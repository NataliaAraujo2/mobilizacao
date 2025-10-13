// src/hooks/useIBGE.js
import { useState, useEffect } from "react";

export function useIBGE() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  // Carrega todos os estados
  useEffect(() => {
    async function fetchStates() {
      setLoadingStates(true);
      try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados");
        const data = await res.json();

        // ordena por nome
        const sorted = data.sort((a, b) => a.nome.localeCompare(b.nome));
        setStates(sorted);
      } catch (err) {
        console.error("❌ Erro ao carregar estados do IBGE:", err);
      } finally {
        setLoadingStates(false);
      }
    }

    fetchStates();
  }, []);

  // Busca municípios por estado (id numérico do IBGE, não sigla)
  const fetchCities = async (stateId) => {
    if (!stateId) return;
    setLoadingCities(true);
    try {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios`
      );
      const data = await res.json();
      const sorted = data.sort((a, b) => a.nome.localeCompare(b.nome));
      setCities(sorted);
    } catch (err) {
      console.error("❌ Erro ao carregar municípios do IBGE:", err);
    } finally {
      setLoadingCities(false);
    }
  };

  return { states, cities, fetchCities, loadingStates, loadingCities };
}
