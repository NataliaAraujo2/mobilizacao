import { useState, useEffect } from "react";
import styles from "../styles/Form.module.css";
import { useIBGE } from "../hooks/useIBGE";
import { useNavigate, useParams } from "react-router-dom";
import Button from "./ui/Button";
import { usePartners } from "../hooks/usePartners";

// 🔹 Definição dos campos padrão
const defaultFormData = {
  name: "",
  website: "",
  email: "",
  description: "",
  estado: "",
  municipio: "",
  statusCadastro: "pending",
  statusLogo: "pending",
  logoPath: null,
  createdAt: null,
  updatedAt: null,
};

export default function PartnerForm() {
  const { states, cities, fetchCities, loadingStates, loadingCities } =
    useIBGE();
  const { createPartner, updatePartner, getPartnerById } = usePartners();
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  // 🔹 Carrega dados do parceiro quando for edição
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const fetchPartner = async () => {
      try {
        setLoading(true);
        const partner = await getPartnerById(id);
        if (partner && isMounted) {
          setFormData((prev) => ({ ...prev, ...partner }));

          if (partner.estado) {
            await fetchCities(partner.estado);
          }
        }
      } catch (err) {
        console.error("❌ Erro ao carregar parceiro:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPartner();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "estado") {
      setFormData((prev) => ({ ...prev, municipio: "" }));
      fetchCities(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);

    try {
      const payload = { ...formData }; // 🔹 não sobrescreve mais

      if (id) {
        await updatePartner(id, payload);
        setSuccess("Parceiro atualizado com sucesso!");
      } else {
        await createPartner(payload);
        setSuccess("Cadastro enviado! Aguarde aprovação da ONG.");
        setFormData(defaultFormData); // limpa formulário só no cadastro novo
      }
    } catch (err) {
      console.error(err);
      setSuccess(`Erro ao salvar. Tente novamente: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    // Caso Firestore Timestamp
    if (date.toDate) {
      return date.toDate().toLocaleString("pt-BR");
    }

    // Caso string ou Date já
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleString("pt-BR");
    }

    return "—";
  };

  return (
    <section className={styles.container}>
      <div className={styles.title}>
        <h2>{id ? "Editar Parceiro" : "Cadastro de Parceiros"}</h2>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>

      <p>
        {id
          ? "Atualize as informações do parceiro."
          : "Preencha o formulário abaixo para cadastrar um parceiro."}
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Nome da Empresa *
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Site *
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          E-mail de contato *
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </label>

        {/* Estado */}
        <label>
          Estado *
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            required
          >
            <option value="">
              {loadingStates ? "Carregando..." : "Selecione..."}
            </option>
            {states.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.sigla} - {estado.nome}
              </option>
            ))}
          </select>
        </label>

        {/* Município */}
        {formData.estado && (
          <label>
            Município *
            <select
              name="municipio"
              value={formData.municipio}
              onChange={handleChange}
              required
            >
              <option value="">
                {loadingCities ? "Carregando..." : "Selecione..."}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Descrição da parceria
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
          />
        </label>

        {/* 🔹 Campos extras - só aparecem no modo edição */}
        {id && (
          <div className={styles.extraFields}>
            <label>
              Logo Path
              <input
                type="text"
                name="logoPath"
                value={formData.logoPath ?? ""}
                onChange={handleChange}
                placeholder="URL ou caminho da logo"
              />
            </label>

            <label>
              Status do Cadastro
              <select
                name="statusCadastro"
                value={formData.statusCadastro}
                onChange={handleChange}
              >
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
              </select>
            </label>

            <label>
              Status da Logo
              <select
                name="statusLogo"
                value={formData.statusLogo}
                onChange={handleChange}
              >
                <option value="pending">Pendente</option>
                <option value="approved">Aprovada</option>
                <option value="rejected">Rejeitada</option>
              </select>
            </label>

            <div className={styles.readonlyField}>
              <strong>Criado em:</strong> {formatDate(formData.createdAt)}
            </div>

            <div className={styles.readonlyField}>
              <strong>Última atualização:</strong>{" "}
              {formatDate(formData.updatedAt)}
            </div>
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading
            ? "Salvando..."
            : id
            ? "Salvar alterações"
            : "Enviar cadastro"}
        </button>
      </form>

      {success && <p className={styles.feedback}>{success}</p>}
    </section>
  );
}
