import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import styles from "../styles/RestrictedArea.module.css";

export default function RestrictedArea() {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Área Restrita</h2>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === "login" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("login")}
        >
          Login
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "register" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("register")}
        >
          Cadastro
        </button>
      </div>

      {/* Conteúdo */}
      <div className={styles.content}>
        {activeTab === "login" ? <Login /> : <Register />}
      </div>
    </section>
  );
}
