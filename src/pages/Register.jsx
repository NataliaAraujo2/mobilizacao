//src/pages/Register.jsx
import { useState } from "react";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { permissionsBase } from "../config/permissionsMap"; // ✅ ajustado import
import styles from "../styles/Register.module.css";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    scope: "voluntario", // nível de atuação
    position: "geral", // função dentro do nível
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback("");

    try {
      // cria no Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // pega permissões de acordo com scope + position
      const permissions =
        permissionsBase[formData.scope]?.[formData.position] ||
        permissionsBase[formData.scope]?.geral ||
        [];

      // salva no Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        scope: {
          nivel: formData.scope,
          estado: null,
          municipio: null,
        }, // 🔹 agora coerente com AuthProvider
        position: formData.position,
        permissions,
        approved: false, // 🔹 admin vai aprovar depois
        createdAt: serverTimestamp(),
      });

      setFeedback("✅ Cadastro realizado! Aguarde aprovação do administrador.");
      setFormData({
        name: "",
        email: "",
        password: "",
        scope: "voluntario",
        position: "geral",
      });
    } catch (err) {
      console.error("Erro no cadastro:", err);
      setFeedback("❌ Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <section className={styles.container}>
        <h2 className={styles.title}>Cadastro</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            name="name"
            placeholder="Nome completo"
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="E-mail"
            value={formData.email}
            onChange={handleChange}
            className={styles.input}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            className={styles.input}
            required
          />

          {/* Nível de atuação */}
          <label className={styles.label}>Nível de Atuação</label>
          <select
            name="scope"
            value={formData.scope}
            onChange={handleChange}
            className={styles.input}
          >
            <option value="voluntario">Voluntário</option>
            <option value="parceiro">Parceiro</option>
            <option value="municipal">Coordenação Municipal</option>
            <option value="estadual">Coordenação Estadual</option>
            <option value="nacional">Coordenação Nacional</option>
          </select>

          {/* Função aparece apenas se for coordenação */}
          {["municipal", "estadual", "nacional"].includes(formData.scope) && (
            <>
              <label className={styles.label}>Função</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className={styles.input}
              >
                <option value="geral">Coordenador Geral</option>
                <option value="financeiro">Coordenador Financeiro</option>
                <option value="projetos">Coordenador de Projetos</option>
                <option value="comunicacao">Comunicação</option>
              </select>
            </>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </form>
        {feedback && <p className={styles.feedback}>{feedback}</p>}
      </section>
    </Card>
  );
}
