import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getBranch } from "../services/branchesService";
import { listVolunteersPage } from "../services/volunteersService";
import { useInfiniteScroll } from "../shared/hooks/useInfiniteScroll";
import ListSearch from '../components/ListSearch';
import styles from "./ConsultationPage.module.css";

export default function ConsultationPage() {
  const { user, claims } = useAuth();
  const [branch, setBranch] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preparingPrint, setPreparingPrint] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const preparingRef = useRef(false);
  const mountedRef = useRef(true);

  const buscarPagina = useCallback(({ filtros, cursor, pageSize }) => listVolunteersPage({
    branchId: claims.branchId, activeOnly: true, search: filtros.search, cursor, pageSize,
  }), [claims.branchId]);
  const { dados: volunteers, loading: loadingVolunteers, error: listError, hasMore, recarregar, carregarMais } = useInfiniteScroll(buscarPagina, { pageSize: 10 });

  useEffect(() => {
    getBranch(claims.branchId)
      .then(setBranch)
      .catch(() => setError("Não foi possível carregar a listagem da regional."))
      .finally(() => setLoading(false));
  }, [claims.branchId]);

  useEffect(() => { recarregar({ search }); }, [recarregar, search]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (!printReady) return;
    setPrintReady(false);
    window.print();
  }, [printReady]);

  async function printAll() {
    if (preparingRef.current || loadingVolunteers) return;
    if (!window.confirm("Carregar os voluntários restantes desta regional, respeitando a busca atual, e imprimir? Isso fará leituras adicionais no banco.")) return;
    preparingRef.current = true; setPreparingPrint(true); setError("");
    try {
      let remaining = hasMore;
      while (remaining && mountedRef.current) {
        const result = await carregarMais();
        if (!result || result.error || result.skipped || result.ignored) throw new Error("Não foi possível carregar a lista completa. Tente novamente; os registros já carregados foram mantidos.");
        remaining = result.hasMore;
      }
      if (mountedRef.current) setPrintReady(true);
    } catch (err) { if (mountedRef.current) setError(err.message); }
    finally { preparingRef.current = false; if (mountedRef.current) setPreparingPrint(false); }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>Consulta da regional</p><h1>{branch?.name ?? "Minha regional"}</h1><span>Usuário: {user.displayName ?? user.email}</span></div>
        <span className={styles.readOnly}>Somente consulta</span>
      </header>

      <section className={styles.actions} aria-labelledby="list-title">
        <div><h2 id="list-title">Listagem de voluntários</h2><p>{volunteers.length} carregado{volunteers.length === 1 ? "" : "s"}</p></div>
        <ListSearch placeholder="Nome do voluntário" initialValue={search} disabled={preparingPrint} onSearch={value => { if (!preparingRef.current) setSearch(value); }} />
        <button type="button" disabled={loading || loadingVolunteers || preparingPrint || !!listError || volunteers.length === 0} onClick={() => window.print()}>Imprimir carregados ({volunteers.length})</button>
        <button type="button" disabled={loading || loadingVolunteers || preparingPrint || !!listError || volunteers.length === 0} onClick={printAll}>{preparingPrint ? "Carregando para impressão…" : "Carregar todos e imprimir"}</button>
      </section>

      <p className={styles.safety}>Esta conta consulta somente nome e meios de contato. CPF, RG e nascimento ficam protegidos e não são exibidos ou impressos.</p>
      <p role="status">{preparingPrint ? `Preparando lista: ${volunteers.length} voluntários carregados…` : `${volunteers.length} voluntários carregados. ${hasMore ? "Lista parcial: existem mais registros para carregar." : "Todos os resultados da busca foram carregados."}`}{search && ` Busca aplicada: ${search}.`}</p>
      {(error || listError) && <p className={styles.error} role="alert">{error || "Não foi possível carregar a listagem."}</p>}

      <section className={styles.list} aria-live="polite">
        {loading || (loadingVolunteers && volunteers.length === 0) ? <p aria-busy="true">Carregando...</p> : volunteers.length === 0 ? <p className={styles.empty}>Nenhum voluntário encontrado nesta regional.</p> : volunteers.map((volunteer, index) => (
          <article className={styles.volunteer} key={volunteer.id}>
            <span className={styles.number}>{index + 1}</span>
            <div className={styles.name}><span>Nome</span><strong>{volunteer.fullName}</strong></div>
            <div><span>E-mail</span><strong>{volunteer.email || "Não informado"}</strong></div>
            <div><span>Telefone</span><strong>{volunteer.phone || "Não informado"}</strong></div>
          </article>
        ))}
      </section>
      {volunteers.length > 0 && hasMore && <button className={styles.loadMore} type="button" disabled={loadingVolunteers || preparingPrint} onClick={carregarMais}>{loadingVolunteers ? "Carregando..." : "Carregar mais voluntários"}</button>}
    </main>
  );
}
