import React, { useEffect, useState } from "react";
import brazilStates from "../utils/brazilStates";
import { useProjects } from "../hooks/useProjects";
import { useCoordination } from "../hooks/useCoordination";
import { projectModel } from "../models/projectModel";
import Card from "./ui/Card";
import Button from "./ui/Button";
import styles from "../styles/ProjectForm.module.css";

export function ProjectForm({ project = null, onClose }) {
  const coordinationHook = useCoordination(); // 🔹 hook de coordenação
  const { createProject, updateProject, status } = useProjects(coordinationHook);
  const [formData, setFormData] = useState(project || projectModel);

  useEffect(() => {
    if (project) setFormData(project);
  }, [project]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      contatos: { ...prev.contatos, [name]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const dataToSave = {
        ...formData,
        qrcodePix: {},
        fotos: [`assets/projects/${formData.state}`],
      };

      if (project?.id) {
        await updateProject(project.id, dataToSave);
      } else {
        // 🔹 Busca a coordenação correspondente ao estado selecionado
        const coordination = await coordinationHook.getCoordinationByState(formData.state);
        const coordinationId = coordination?.id || null;

        // 🔹 Cria projeto e adiciona automaticamente à coordenação
        await createProject(dataToSave, coordinationId);
      }

      if (onClose) onClose();
    } catch (err) {
      console.error("Erro ao salvar projeto:", err);
    }
  };

  return (
    <Card
      title={project ? "Editar Projeto Estadual" : "Cadastrar Novo Projeto"}
      className={styles.cardWrapper}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Estado */}
        <div className={styles.formGroup}>
          <label htmlFor="state">Estado</label>
          <select
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            disabled={!!project}
          >
            <option value="">Selecione um estado</option>
            {brazilStates.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {/* Nome */}
        <div className={styles.formGroup}>
          <label htmlFor="nome">Nome do projeto</label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>

        {/* Endereço */}
        <div className={styles.formGroup}>
          <label htmlFor="endereco">Endereço</label>
          <input
            id="endereco"
            name="endereco"
            type="text"
            value={formData.endereco}
            onChange={handleChange}
          />
        </div>

        {/* Descrição */}
        <div className={styles.formGroup}>
          <label htmlFor="descricao">Descrição</label>
          <textarea
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            rows="4"
          />
        </div>

        {/* Contatos */}
        <fieldset className={styles.fieldset}>
          <legend>Contatos</legend>
          <div className={styles.contactGrid}>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={formData.contatos.email}
                onChange={handleContactChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input
                name="telefone"
                type="text"
                value={formData.contatos.telefone}
                onChange={handleContactChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label>WhatsApp</label>
              <input
                name="whatsapp"
                type="text"
                value={formData.contatos.whatsapp}
                onChange={handleContactChange}
              />
            </div>
          </div>
        </fieldset>

        {/* Botões */}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={status.create === "loading" || status.update === "loading"}
          >
            {project ? "Salvar alterações" : "Criar projeto"}
          </Button>
        </div>

        {/* Feedback */}
        {status.error && <p className={styles.error}>Erro: {status.error}</p>}
        {status.message && <p className={styles.success}>{status.message}</p>}
      </form>
    </Card>
  );
}
