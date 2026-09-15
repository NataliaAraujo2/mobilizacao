import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { addAction, deleteAction, listActionsPage, uploadActionPhotos } from "../services/actionsService";
import { listBranches } from "../services/branchesService";
import { findAddressByCep } from "../services/cepService";
import { useInfiniteScroll } from "../shared/hooks/useInfiniteScroll";
import ListSearch from '../components/ListSearch';
import ActionPhotoGallery from '../components/ActionPhotoGallery';
import styles from "./ActionsPage.module.css";

const EMPTY_ADDRESS = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", source: "manual" };
const EMPTY_FORM = { name: "", branchId: "", startDate: "", endDate: "", startTime: "", endTime: "", scheduleText: "", address: EMPTY_ADDRESS, description: "", whatToBring: "", tips: "", status: "planning" };
const EMPTY_PHOTOS = { before: [], during: [], after: [] };

function formatCep(value) {
  return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export default function ActionsPage() {
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState(EMPTY_PHOTOS);
  const [searchingCep, setSearchingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [photoActionId, setPhotoActionId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [qrAction, setQrAction] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const buscarPagina = useCallback(({ filtros, cursor, pageSize }) => (
    listActionsPage({ search: filtros.search, cursor, pageSize })
  ), []);
  const { dados: actions, loading, error: listError, hasMore, recarregar, carregarMais } = useInfiniteScroll(buscarPagina, { pageSize: 10 });

  useEffect(() => {
    listBranches()
      .then((branchList) => {
        setBranches(branchList.filter((branch) => branch.status === "active"));
      })
      .catch(() => setError("Não foi possível carregar as coordenações estaduais."));
  }, []);

  useEffect(() => { recarregar({ search }); }, [recarregar, search]);

  function updateAddress(field, value) {
    setForm((current) => ({ ...current, address: { ...current.address, [field]: value, source: field === "cep" ? current.address.source : "manual" } }));
  }

  async function searchCep() {
    setSearchingCep(true);
    setError("");
    try {
      const address = await findAddressByCep(form.address.cep);
      setForm((current) => ({ ...current, address: { ...current.address, ...address, number: current.address.number } }));
      setMessage("Endereço encontrado. Confira e complete o número.");
    } catch (cepError) {
      setError(cepError.message);
      setForm((current) => ({ ...current, address: { ...current.address, source: "manual" } }));
    } finally {
      setSearchingCep(false);
    }
  }

  function selectPhotos(phase, fileList) {
    const selected = Array.from(fileList);
    if (selected.length > 5) {
      setError("Selecione no máximo 5 fotos por etapa.");
      return;
    }
    if (selected.some((file) => !file.type.startsWith("image/"))) {
      setError("Selecione somente arquivos de imagem.");
      return;
    }
    setError("");
    setPhotos((current) => ({ ...current, [phase]: selected }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setProgress("Salvando os dados da ação...");
    try {
      const created = await addAction({ ...form, address: { ...form.address, cep: form.address.cep.replace(/\D/g, "") } });
      for (const phase of ["before", "during", "after"]) {
        if (photos[phase].length) {
          await uploadActionPhotos(created, phase, photos[phase], (done, total) => setProgress(`Enviando fotos: ${done} de ${total}`));
        }
      }
      await recarregar({ search });
      setForm(EMPTY_FORM);
      setPhotos(EMPTY_PHOTOS);
      setProgress("");
      setMessage("Ação cadastrada com sucesso.");
    } catch (saveError) {
      setError(saveError.message || "Não foi possível cadastrar a ação.");
      setProgress("");
    } finally {
      setSaving(false);
    }
  }

  async function addMorePhotos(event, action) {
    event.preventDefault();
    const limits = { before: action.photosBefore?.length ?? 0, during: action.photosDuring?.length ?? 0, after: action.photosAfter?.length ?? 0 };
    if (Object.keys(limits).some((phase) => limits[phase] + photos[phase].length > 5)) {
      setError("Cada etapa pode ter no máximo 5 fotos.");
      return;
    }
    setSaving(true);
    setError("");
    setProgress("Preparando as novas fotos...");
    try {
      for (const phase of ["before", "during", "after"]) {
        if (photos[phase].length) await uploadActionPhotos(action, phase, photos[phase], (done, total) => setProgress(`Enviando fotos: ${done} de ${total}`));
      }
      await recarregar({ search });
      setPhotos(EMPTY_PHOTOS);
      setPhotoActionId("");
      setProgress("");
      setMessage("Fotos adicionadas à ação.");
    } catch (uploadError) {
      setError(uploadError.message || "Não foi possível enviar as fotos.");
      setProgress("");
    } finally {
      setSaving(false);
    }
  }

  async function removeAction(action) {
    if (!window.confirm(`Excluir permanentemente a ação “${action.name}”? Voluntários deixarão de estar vinculados a ela, e as fotos e presenças serão removidas.`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    setProgress("Excluindo ação, vínculos e fotos...");
    try {
      await deleteAction(action.id);
      if (photoActionId === action.id) setPhotoActionId("");
      setPhotos(EMPTY_PHOTOS);
      await recarregar({ search });
      setMessage("Ação excluída com sucesso.");
    } catch (deleteError) {
      setError(deleteError.message || "Não foi possível excluir a ação.");
    } finally {
      setProgress("");
      setSaving(false);
    }
  }

  async function showQrCode(action) {
    const url = `${window.location.origin}/participar/${action.id}`;
    setQrAction({ ...action, publicUrl: url });
    setQrDataUrl(await QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M" }));
  }

  function downloadQrCode() {
    if (!qrDataUrl || !qrAction) return;
    const link = document.createElement("a"); link.href = qrDataUrl; link.download = `qr-${qrAction.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; link.click();
  }

  return (
    <main className={styles.page}>
      <header className={styles.title}><div><p>Administração nacional</p><h1>Ações</h1></div><span>{actions.length} carregada{actions.length === 1 ? "" : "s"}</span></header>

      <section className={styles.card} aria-labelledby="action-form-title">
        <h2 id="action-form-title">Cadastrar ação</h2>
        <p className={styles.help}>Comece com as informações disponíveis. As fotos de durante e depois poderão ser acrescentadas posteriormente.</p>
        <form onSubmit={handleSubmit}>
          <fieldset><legend>Informações principais</legend><div className={styles.grid}>
            <label className={styles.wide}>Nome da ação<input required minLength="3" maxLength="160" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className={styles.wide}>Descrição <small>(opcional)</small><textarea rows="4" maxLength="1500" placeholder="Explique o objetivo e como será a ação." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label>Coordenação estadual responsável<select required value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">Selecione</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.state}</option>)}</select></label>
            <label>Data de início<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value, endDate: form.endDate || event.target.value })} /></label>
            <label>Hora de início<input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label>Data de fim<input required type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
            <label>Hora de fim<input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
            <label className={styles.wide}>Informações de data e horário <small>(opcional)</small><textarea rows="3" maxLength="500" placeholder="Ex.: concentração às 8h30; atividade sujeita às condições climáticas." value={form.scheduleText} onChange={(event) => setForm({ ...form, scheduleText: event.target.value })} /></label>
          </div></fieldset>

          <fieldset><legend>Endereço</legend><p>Busque pelo CEP ou preencha qualquer campo manualmente.</p><div className={styles.grid}>
            <label>CEP<div className={styles.cepRow}><input inputMode="numeric" placeholder="00000-000" value={form.address.cep} onChange={(event) => updateAddress("cep", formatCep(event.target.value))} /><button type="button" disabled={searchingCep || form.address.cep.replace(/\D/g, "").length !== 8} onClick={searchCep}>{searchingCep ? "Buscando..." : "Buscar CEP"}</button></div></label>
            <label className={styles.wide}>Logradouro<input required value={form.address.street} onChange={(event) => updateAddress("street", event.target.value)} /></label>
            <label>Número<input required inputMode="numeric" value={form.address.number} onChange={(event) => updateAddress("number", event.target.value)} /></label>
            <label>Complemento <small>(opcional)</small><input value={form.address.complement} onChange={(event) => updateAddress("complement", event.target.value)} /></label>
            <label>Bairro<input value={form.address.neighborhood} onChange={(event) => updateAddress("neighborhood", event.target.value)} /></label>
            <label>Cidade<input required value={form.address.city} onChange={(event) => updateAddress("city", event.target.value)} /></label>
            <label>Estado<input required maxLength="2" placeholder="UF" value={form.address.state} onChange={(event) => updateAddress("state", event.target.value.toUpperCase())} /></label>
          </div></fieldset>

          <fieldset><legend>Orientações</legend><div className={styles.grid}>
            <label className={styles.wide}>O que levar<textarea rows="4" placeholder="Ex.: luvas, garrafa de água, protetor solar..." value={form.whatToBring} onChange={(event) => setForm({ ...form, whatToBring: event.target.value })} /></label>
            <label className={styles.wide}>Dicas e orientações<textarea rows="5" placeholder="Informações importantes para os participantes" value={form.tips} onChange={(event) => setForm({ ...form, tips: event.target.value })} /></label>
          </div></fieldset>

          <fieldset><legend>Fotos</legend><p>Até 5 fotos em cada etapa. As imagens serão reduzidas antes do envio para economizar internet e armazenamento.</p><div className={styles.photoGrid}>
            {[["before", "Antes"], ["during", "Durante"], ["after", "Depois"]].map(([phase, label]) => <label className={styles.photoField} key={phase}><strong>{label}</strong><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectPhotos(phase, event.target.files)} /><span>{photos[phase].length ? `${photos[phase].length} foto(s) selecionada(s)` : "Nenhuma foto selecionada"}</span></label>)}
          </div></fieldset>

          <button className={styles.submit} type="submit" disabled={saving || branches.length === 0}>{saving ? "Salvando..." : "Cadastrar ação"}</button>
          {progress && <p className={styles.progress} role="status">{progress}</p>}
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
      </section>

      <section className={styles.card} aria-labelledby="actions-list-title"><div className={styles.listHeading}><h2 id="actions-list-title">Ações cadastradas</h2><ListSearch label="Buscar ação" placeholder="Nome da ação" initialValue={search} onSearch={setSearch} /></div>{listError && <p className={styles.error}>Não foi possível carregar as ações. <button type="button" onClick={() => recarregar({ search })}>Tentar novamente</button></p>}{loading && actions.length === 0 ? <p aria-busy="true">Carregando...</p> : actions.length === 0 ? <p>Nenhuma ação encontrada.</p> : <div className={styles.list}>{actions.map((action) => <article key={action.id}>
        <div className={styles.actionSummary}><div><h3>{action.name}</h3><p>{action.address.city}/{action.address.state} · {action.address.street}, {action.address.number}</p><small>Fotos: {action.photosBefore?.length ?? 0} antes · {action.photosDuring?.length ?? 0} durante · {action.photosAfter?.length ?? 0} depois</small></div><span>Planejamento</span><button type="button" disabled={saving} onClick={() => showQrCode(action)}>QR Code</button><button type="button" disabled={saving} onClick={() => { setPhotoActionId(photoActionId === action.id ? "" : action.id); setPhotos(EMPTY_PHOTOS); }}>{photoActionId === action.id ? "Cancelar" : "Adicionar fotos"}</button><button className={styles.deleteAction} type="button" disabled={saving} onClick={() => removeAction(action)}>Excluir ação</button></div>
        {photoActionId === action.id && <><ActionPhotoGallery action={action} /><form className={styles.morePhotos} onSubmit={(event) => addMorePhotos(event, action)}><p>Escolha somente as novas fotos. O limite é de 5 por etapa.</p><div className={styles.photoGrid}>{[["before", "Antes"], ["during", "Durante"], ["after", "Depois"]].map(([phase, label]) => <label className={styles.photoField} key={phase}><strong>{label}</strong><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectPhotos(phase, event.target.files)} /><span>{photos[phase].length ? `${photos[phase].length} selecionada(s)` : "Nenhuma nova foto"}</span></label>)}</div><button className={styles.submit} type="submit" disabled={saving || !Object.values(photos).some((items) => items.length)}>{saving ? "Enviando..." : "Enviar novas fotos"}</button></form></>}
      </article>)}</div>}{actions.length > 0 && hasMore && <button className={styles.loadMore} type="button" disabled={loading} onClick={carregarMais}>{loading ? "Carregando..." : "Carregar mais ações"}</button>}</section>
      {qrAction && <div className={styles.qrBackdrop} role="presentation"><section className={styles.qrModal} role="dialog" aria-modal="true" aria-labelledby="qr-title"><h2 id="qr-title">QR Code da ação</h2><h3>{qrAction.name}</h3><img src={qrDataUrl} alt={`QR Code para participar de ${qrAction.name}`} /><p>Leia este código para abrir o cadastro/login do voluntário já vinculado a esta ação.</p><input readOnly value={qrAction.publicUrl} aria-label="Link público da ação" /><div><button type="button" onClick={downloadQrCode}>Baixar QR Code</button><button type="button" onClick={() => window.print()}>Imprimir</button><button type="button" onClick={() => navigator.clipboard.writeText(qrAction.publicUrl)}>Copiar link</button><button type="button" onClick={() => setQrAction(null)}>Fechar</button></div></section></div>}
    </main>
  );
}
