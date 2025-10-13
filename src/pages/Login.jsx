//src/pages/Login.jsx
import { useState } from "react";
import { auth } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Login.module.css";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback("");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      setFeedback("✅ Login realizado com sucesso!");
      // 🔹 Deixa o AuthProvider + PrivateRoute cuidarem do redirecionamento
      navigate("/");
    } catch (err) {
      console.error("Erro no login:", err);
      setFeedback("❌ E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <section className={styles.container}>
        <h2 className={styles.title}>Login</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />

          <Button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        {feedback && <p className={styles.feedback}>{feedback}</p>}
      </section>
    </Card>
  );
}
