import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Gerencia uma lista paginada por cursor.
 *
 * A função `buscarPagina` deve retornar:
 * { data: Array, cursor: DocumentSnapshot | null, hasMore: boolean }
 *
 * O cursor deve ser o último DocumentSnapshot da página, e não um objeto
 * convertido para JavaScript. Assim o serviço pode usá-lo com startAfter().
 */
export function useInfiniteScroll(buscarPagina, { pageSize = 25, initialFilters = {} } = {}) {
  const [dados, setDados] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef(null);
  const filtersRef = useRef(initialFilters);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateLoading = useCallback((value) => {
    loadingRef.current = value;
    if (mountedRef.current) setLoading(value);
  }, []);

  const updatePagination = useCallback(({ nextCursor = null, nextHasMore = false }) => {
    cursorRef.current = nextCursor;
    hasMoreRef.current = nextHasMore;
    if (!mountedRef.current) return;
    setCursor(nextCursor);
    setHasMore(nextHasMore);
  }, []);

  const recarregar = useCallback(async (filtros = filtersRef.current) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    filtersRef.current = filtros;
    updateLoading(true);
    if (mountedRef.current) setError(null);

    try {
      const result = await buscarPagina({ filtros, cursor: null, pageSize });
      if (!mountedRef.current || requestId !== requestIdRef.current) return { ignored: true };

      const novosDados = Array.isArray(result?.data) ? result.data : [];
      setDados(novosDados);
      updatePagination({
        nextCursor: result?.cursor ?? null,
        nextHasMore: result?.hasMore === true,
      });
      return result;
    } catch (requestError) {
      if (mountedRef.current && requestId === requestIdRef.current) setError(requestError);
      return { error: requestError };
    } finally {
      if (requestId === requestIdRef.current) updateLoading(false);
    }
  }, [buscarPagina, pageSize, updateLoading, updatePagination]);

  const carregarMais = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || !cursorRef.current) return { skipped: true };

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const currentCursor = cursorRef.current;
    updateLoading(true);
    if (mountedRef.current) setError(null);

    try {
      const result = await buscarPagina({
        filtros: filtersRef.current,
        cursor: currentCursor,
        pageSize,
      });
      if (!mountedRef.current || requestId !== requestIdRef.current) return { ignored: true };

      const novosDados = Array.isArray(result?.data) ? result.data : [];
      setDados((anteriores) => {
        const porId = new Map(anteriores.map((item) => [item.id, item]));
        novosDados.forEach((item) => porId.set(item.id, item));
        return Array.from(porId.values());
      });
      updatePagination({
        nextCursor: result?.cursor ?? null,
        nextHasMore: result?.hasMore === true,
      });
      return result;
    } catch (requestError) {
      if (mountedRef.current && requestId === requestIdRef.current) setError(requestError);
      return { error: requestError };
    } finally {
      if (requestId === requestIdRef.current) updateLoading(false);
    }
  }, [buscarPagina, pageSize, updateLoading, updatePagination]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    filtersRef.current = initialFilters;
    cursorRef.current = null;
    hasMoreRef.current = true;
    loadingRef.current = false;
    if (!mountedRef.current) return;
    setDados([]);
    setCursor(null);
    setHasMore(true);
    setLoading(false);
    setError(null);
  }, [initialFilters]);

  const atualizarDados = useCallback((updater) => {
    setDados((anteriores) => {
      const proximos = typeof updater === "function" ? updater(anteriores) : updater;
      return Array.isArray(proximos) ? proximos : anteriores;
    });
  }, []);

  return {
    dados,
    cursor,
    loading,
    error,
    hasMore,
    filtros: filtersRef.current,
    recarregar,
    carregarMais,
    reset,
    atualizarDados,
  };
}
