import { useState, useEffect } from "react";
import { useCoordination } from "../hooks/useCoordination";
import brazilStates from "../utils/brazilStates";
import { coordinateModel } from "../models/coordinateModel";
import styles from "../styles/CoordinationForm.module.css";
import teamRoles from "../utils/teamRoles";

const photos = import.meta.glob("/src/assets/team/**/*.jpg", { eager: true });

export function CoordinationForm({ coordinationId, onClose }) {
  const {
    createCoordination,
    updateCoordination,
    getCoordinationById,
    removeTeamMember,
    status,
  } = useCoordination();

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [form, setForm] = useState({ ...coordinateModel });

  // 🔹 Função auxiliar para buscar a imagem pelo caminho
  function getFoto(path) {
    return photos[`/src${path}`]?.default || "/assets/default-photo.jpg";
  }

  // 🔹 Carregar coordenação existente
  useEffect(() => {
    if (coordinationId) {
      (async () => {
        const data = await getCoordinationById(coordinationId);
        if (data) setForm({ ...coordinateModel, ...data });
      })();
    } else {
      setForm({ ...coordinateModel }); // reset ao criar nova
    }
  }, [coordinationId, getCoordinationById]);

  // 🔹 Função utilitária para gerar path da foto
  const getTeamPhotoPath = (state, cargo) => {
    if (!state || !cargo) return "";
    const stateFolder = state.replace(/\s+/g, "_");
    const cargoFile = cargo.replace(/\s+/g, "_");
    return `/assets/team/${stateFolder}/${cargoFile}.jpg`;
  };

  // 🔹 Atualiza campos simples
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Atualiza contatos
  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      contatos: { ...prev.contatos, [name]: value },
    }));
  };

  // 🔹 Atualiza QR Code Pix
  const handlePixChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      qrcodePix: { ...prev.qrcodePix, [name]: value },
    }));
  };

  // 🔹 Adicionar membro da equipe (local)
  const addTeamMember = (nome, cargo) => {
    if (!form.state) {
      alert("Selecione o estado antes de adicionar membros.");
      return;
    }
    const fotoPath = getTeamPhotoPath(form.state, cargo);
    const newMember = { nome, cargo, foto: fotoPath };

    setForm((prev) => ({
      ...prev,
      team: [...(prev.team || []), newMember],
    }));
  };

  // 🔹 Atualizar membro localmente
  const updateTeamMember = (index, data) => {
    setForm((prev) => {
      const newTeam = [...prev.team];
      const updatedMember = { ...newTeam[index], ...data };
      updatedMember.foto = getTeamPhotoPath(form.state, updatedMember.cargo);
      newTeam[index] = updatedMember;
      return { ...prev, team: newTeam };
    });
  };

  // 🔹 Remover membro (Firestore + local)
  const handleRemoveMember = async (member) => {
    try {
      if (!coordinationId) {
        // Apenas local se ainda não foi criado no Firestore
        setForm((prev) => ({
          ...prev,
          team: prev.team.filter((m) => m.nome !== member.nome),
        }));
        return;
      }

      const newTeam = await removeTeamMember(coordinationId, member);
      setForm((prev) => ({ ...prev, team: newTeam }));
    } catch (err) {
      console.error("Falha ao remover membro:", err);
    }
  };

  // 🔹 Submeter formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const teamWithPhotos = (form.team || []).map((m) => ({
        ...m,
        foto: getTeamPhotoPath(form.state, m.cargo),
      }));

      const dataToSave = {
        ...form,
        ...(teamWithPhotos.length > 0 ? { team: teamWithPhotos } : {}),
      };

      if (coordinationId) {
        await updateCoordination(coordinationId, dataToSave);
      } else {
        await createCoordination(dataToSave);
      }

      alert("Coordenação salva com sucesso!");
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar coordenação: " + err.message);
    }
  };

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit}>
      <h2>{coordinationId ? "Editar Coordenação" : "Nova Coordenação"}</h2>

      {/* Estado */}
      <label>Estado:</label>
      <select name="state" value={form.state} onChange={handleChange} required>
        <option value="">Selecione</option>
        {brazilStates.map((s) => (
          <option key={s.code} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Endereço */}
      <label>Endereço:</label>
      <input
        type="text"
        name="endereco"
        value={form.endereco}
        onChange={handleChange}
      />

      {/* Contatos */}
      <h3>Contatos</h3>
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.contatos.email}
        onChange={handleContactChange}
      />
      <input
        type="text"
        name="telefone"
        placeholder="Telefone"
        value={form.contatos.telefone}
        onChange={handleContactChange}
      />
      <input
        type="text"
        name="whatsapp"
        placeholder="Whatsapp"
        value={form.contatos.whatsapp}
        onChange={handleContactChange}
      />

      {/* Pix */}
      <h3>Pix</h3>
      <input
        type="text"
        name="codigo"
        placeholder="Código"
        value={form.qrcodePix.codigo}
        onChange={handlePixChange}
      />
      <input
        type="text"
        name="imagem"
        placeholder="Imagem (URL)"
        value={form.qrcodePix.imagem}
        onChange={handlePixChange}
      />

      {/* Equipe */}
      <h3>Equipe</h3>
      {form.team?.length > 0 &&
        form.team.map((member, index) => (
          <div key={index} className={styles.teamMember}>
            <input
              type="text"
              placeholder="Nome"
              value={member.nome}
              onChange={(e) =>
                updateTeamMember(index, { nome: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Cargo"
              value={member.cargo}
              onChange={(e) =>
                updateTeamMember(index, { cargo: e.target.value })
              }
            />
            <img src={getFoto(member.foto)} alt={member.nome} />
            <button
              type="button"
              onClick={() => handleRemoveMember(member)} // ✅ Corrigido: passa o membro
            >
              Remover
            </button>
          </div>
        ))}

      {/* Novo membro */}
      <div className={styles.addTeamMember}>
        <input
          type="text"
          placeholder="Nome do membro"
          value={newMemberName}
          onChange={(e) => setNewMemberName(e.target.value)}
        />
        <select
          value={newMemberRole}
          onChange={(e) => setNewMemberRole(e.target.value)}
        >
          <option value="">Selecione o cargo</option>
          {teamRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (!newMemberName || !newMemberRole) return;
            addTeamMember(newMemberName, newMemberRole);
            setNewMemberName("");
            setNewMemberRole("");
          }}
        >
          Adicionar Membro
        </button>
      </div>

      <button type="submit">
        {coordinationId ? "Atualizar" : "Criar"}
      </button>

      {status.create === "loading" && <p>Salvando...</p>}
      {status.update === "loading" && <p>Atualizando...</p>}
      {status.error && <p style={{ color: "red" }}>{status.error}</p>}
    </form>
  );
}
