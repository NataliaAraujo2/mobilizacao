import { useEffect, useState } from "react";
import { addAction, listActions, uploadActionPhotos } from "../services/actionsService";
import { listBranches } from "../services/branchesService";
import { findAddressByCep } from "../services/cepService";
import styles from "./ActionsPage.module.css";

const EMPTY_ADDRESS = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", source: "manual" };
const EMPTY_FORM = { name: "", branchId: "", address: EMPTY_ADDRESS, whatToBring: "", tips: "", status: "planning" };
const EMPTY_PHOTOS = { before: [], during: [], after: [] };

function formatCep(value) {
  return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export default function ActionsPage() {
  const [branches, setBranches] = useState([]);
  const [actions, setActions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState(EMPTY_PHOTOS);
  const [loading, setLoading] = useState(true);
  const [searchingCep, setSearchingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [photoActionId, setPhotoActionId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listBranches(), listActions()])
      .then(([branchList, actionList]) => {
        setBranches(branchList.filter((branch) => branch.status === "active"));
        setActions(actionList);
      })
      .catch(() => setError("Não foi possível carregar as ações."))
      .finally(() => setLoading(false));
  }, []);

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
      setActions((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
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
      setActions((current) => current.map((item) => item.id === action.id ? {
        ...item,
        photosBefore: [...(item.photosBefore ?? []), ...photos.before.map((file) => ({ name: file.name }))],
        photosDuring: [...(item.photosDuring ?? []), ...photos.during.map((file) => ({ name: file.name }))],
        photosAfter: [...(item.photosAfter ?? []), ...photos.after.map((file) => ({ name: file.name }))],
      } : item));
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

  return (
    <main className={styles.page}>
      <header className={styles.title}><div><p>Administração nacional</p><h1>Ações</h1></div><span>{actions.length} cadastrada{actions.length === 1 ? "" : "s"}</span></header>

      <section className={styles.card} aria-labelledby="action-form-title">
        <h2 id="action-form-title">Cadastrar ação</h2>
        <p className={styles.help}>Comece com as informações disponíveis. As fotos de durante e depois poderão ser acrescentadas posteriormente.</p>
        <form onSubmit={handleSubmit}>
          <fieldset><legend>Informações principais</legend><div className={styles.grid}>
            <label className={styles.wide}>Nome da ação<input required minLength="3" maxLength="160" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Filial responsável<select required value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">Selecione</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.state}</option>)}</select></label>
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

      <section className={styles.card} aria-labelledby="actions-list-title"><h2 id="actions-list-title">Ações cadastradas</h2>{loading ? <p aria-busy="true">Carregando...</p> : actions.length === 0 ? <p>Nenhuma ação cadastrada.</p> : <div className={styles.list}>{actions.map((action) => <article key={action.id}>
        <div className={styles.actionSummary}><div><h3>{action.name}</h3><p>{action.address.city}/{action.address.state} · {action.address.street}, {action.address.number}</p><small>Fotos: {action.photosBefore?.length ?? 0} antes · {action.photosDuring?.length ?? 0} durante · {action.photosAfter?.length ?? 0} depois</small></div><span>Planejamento</span><button type="button" onClick={() => { setPhotoActionId(photoActionId === action.id ? "" : action.id); setPhotos(EMPTY_PHOTOS); }}>{photoActionId === action.id ? "Cancelar" : "Adicionar fotos"}</button></div>
        {photoActionId === action.id && <form className={styles.morePhotos} onSubmit={(event) => addMorePhotos(event, action)}><p>Escolha somente as novas fotos. O limite é de 5 por etapa.</p><div className={styles.photoGrid}>{[["before", "Antes"], ["during", "Durante"], ["after", "Depois"]].map(([phase, label]) => <label className={styles.photoField} key={phase}><strong>{label}</strong><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectPhotos(phase, event.target.files)} /><span>{photos[phase].length ? `${photos[phase].length} selecionada(s)` : "Nenhuma nova foto"}</span></label>)}</div><button className={styles.submit} type="submit" disabled={saving || !Object.values(photos).some((items) => items.length)}>{saving ? "Enviando..." : "Enviar novas fotos"}</button></form>}
      </article>)}</div>}</section>
    </main>
  );
}
