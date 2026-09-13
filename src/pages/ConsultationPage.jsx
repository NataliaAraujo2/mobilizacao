import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getBranch } from "../services/branchesService";
import { listVolunteersPage } from "../services/volunteersService";
import { useInfiniteScroll } from "../shared/hooks/useInfiniteScroll";
import styles from "./ConsultationPage.module.css";

export default function ConsultationPage() {
  const { user, claims } = useAuth();
  const [branch, setBranch] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const buscarPagina = useCallback(({ filtros, cursor, pageSize }) => listVolunteersPage({
    branchId: claims.branchId, activeOnly: true, search: filtros.search, cursor, pageSize,
  }), [claims.branchId]);
  const { dados: volunteers, loading: loadingVolunteers, error: listError, hasMore, recarregar, carregarMais } = useInfiniteScroll(buscarPagina, { pageSize: 25 });

  useEffect(() => {
    getBranch(claims.branchId)
      .then(setBranch)
      .catch(() => setError("Não foi possível carregar a listagem da regional."))
      .finally(() => setLoading(false));
  }, [claims.branchId]);

  useEffect(() => { recarregar({ search }); }, [recarregar, search]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>Consulta da regional</p><h1>{branch?.name ?? "Minha regional"}</h1><span>Usuário: {user.displayName ?? user.email}</span></div>
        <span className={styles.readOnly}>Somente consulta</span>
      </header>

      <section className={styles.actions} aria-labelledby="list-title">
        <div><h2 id="list-title">Listagem de voluntários</h2><p>{volunteers.length} carregado{volunteers.length === 1 ? "" : "s"}</p></div>
        <form className={styles.searchForm} onSubmit={(event) => { event.preventDefault(); setSearch(searchInput); }}><label>Buscar por nome<input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nome do voluntário" /></label><button type="submit">Buscar</button></form>
        <button type="button" disabled={loading || loadingVolunteers || volunteers.length === 0} onClick={() => { if (window.confirm("Imprimir a listagem de voluntários desta regional?")) window.print(); }}>Imprimir listagem</button>
      </section>

      <p className={styles.safety}>Esta conta consulta somente nome e meios de contato. CPF, RG e nascimento ficam protegidos e não são exibidos ou impressos.</p>
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
      {volunteers.length > 0 && hasMore && <button className={styles.loadMore} type="button" disabled={loadingVolunteers} onClick={carregarMais}>{loadingVolunteers ? "Carregando..." : "Carregar mais voluntários"}</button>}
    </main>
  );
}
