// src/components/ui/Loading.jsx
import React from "react";
import styles from "../../styles/Loading.module.css";

export default function Loading({ message = "Carregando..." }) {
  return (
    <div className={styles.container}>
      <div className={styles.spinner}></div>
      <p>{message}</p>
    </div>
  );
}
