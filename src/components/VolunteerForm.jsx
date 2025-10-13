// src/pages/PartnerForm.jsx
import { useState } from "react";
import { db } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import styles from "../styles/Form.module.css";
import { useIBGE } from "../hooks/useIBGE";

export default function VolunteerForm() {
  const { states, cities, fetchCities, loadingStates, loadingCities } = useIBGE();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telefone:"",
    description: "",
    estado: "",
    municipio: "",
    coordenacao:"",
    projeto:"",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // se mudou o estado, busca municípios
    if (name === "estado") {
      setFormData((prev) => ({ ...prev, municipio: "" })); // reset municipio
      fetchCities(value); // value = ID numérico do IBGE
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);

    try {
      await addDoc(collection(db, "volunteers"), {
        ...formData,
        statusCadastro: "pending",
        createdAt: serverTimestamp(),
      });

      setSuccess("Cadastro enviado! Aguarde aprovação da ONG.");
      setFormData({
        name: "",
        email: "",
        description: "",
        estado: "",
        municipio: "",
      });
    } catch (error) {
      console.error("Erro ao cadastrar voluntário:", error);
      setSuccess("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.container}>
      <h2>Cadastro de Voluntário</h2>
      <p>Preencha o formulário abaixo para solicitar cadastro como voluntário.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Nome Completo *
          <input
            type="text"
            name="name"
            value={formData.name}
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
            <option value="">{loadingStates ? "Carregando..." : "Selecione..."}</option>
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
              <option value="">{loadingCities ? "Carregando..." : "Selecione..."}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Fale sobre você e como quer ajudar
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar cadastro"}
        </button>
      </form>

      {success && <p className={styles.feedback}>{success}</p>}
    </section>
  );
}
