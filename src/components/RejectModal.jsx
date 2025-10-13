// components/RejectModal.jsx
import { useState } from "react";
import styles from "../styles/Modal.module.css";
import Button from "./ui/Button";

export default function RejectModal({ onClose, onConfirm }) {
  const [reason, setReason] = useState("");

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h3>Motivo da Rejeição</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo da rejeição..."
          className={styles.textarea}
        />
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(reason, true)}
            disabled={!reason.trim()}
          >
            Rejeitar com Pendência
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(reason, false)}
            disabled={!reason.trim()}
          >
            Rejeitar Definitivo
          </Button>
        </div>
      </div>
    </div>
  );
}
