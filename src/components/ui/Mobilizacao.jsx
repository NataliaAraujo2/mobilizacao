// src/components/ui/Mobilizacao.jsx
import styles from "../../styles/Mobilizacao.module.css";

export default function Mobilizacao(props) {
  const { as, className = "" } = props;
  const Component = as || "span";

  return (
    <Component className={`${styles.mobilizacao} ${className}`}>
      <span className={styles.primary}>Mobiliz</span>
      <span className={styles.secondary}>Ação</span>
    </Component>
  );
}
