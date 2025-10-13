import React from "react";
import styles from "../../styles/Modal.module.css";

export default function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
   
        <div className={styles.modalContent}>
          {children}
        </div>
      </div>
    </div>
  );
}
