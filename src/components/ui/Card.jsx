import React, { useEffect, useRef } from "react";
import styles from "../../styles/Card.module.css";

export default function Card({ title, children, onClickOutside }) {
  const cardRef = useRef();

  useEffect(() => {
    if (!onClickOutside) return;

    const handleClickOutside = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        onClickOutside();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClickOutside]);

  return (
    <div ref={cardRef} className={styles.card}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
