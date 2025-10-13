import styles from "../styles/Modal.module.css";
import Button from "./ui/Button";

export default function EntityDetails({
  title,
  entity,
  fields,
  onClose,
  extraActions, // 🔹 botões de ação relacionados ao cadastro
  logoActions,  // 🔹 botões de ação relacionados ao logo
}) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h3>{title}</h3>

        {/* Área do logo (se houver) */}
        {entity.logoPath && (
          <div className={styles.logoSection}>
          
            <img
              src={`/partners/${entity.logoPath}`}
              alt={`Logo de ${entity.name || "entidade"}`}
              className={styles.logoPreview}
            />
            {logoActions && (
              <div className={styles.logoActions}>
                {logoActions(entity)}
              </div>
            )}
          </div>
        )}

        {/* Campos dinâmicos */}
        <div className={styles.modalContent}>
          {fields.map(({ label, key }) => (
            <p key={key}>
              <strong>{label}:</strong> {entity[key] || "—"}
            </p>
          ))}
        </div>

        {/* Botões principais */}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {extraActions && extraActions(entity)}
        </div>
      </div>
    </div>
  );
}
