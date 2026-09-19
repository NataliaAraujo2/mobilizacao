import styles from "./PageHeading.module.css";

export default function PageHeading({ eyebrow, title, description, meta, actions }) {
  return <header className={styles.heading}>
    <div className={styles.copy}>
      {eyebrow && <p>{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <span>{description}</span>}
    </div>
    {(meta || actions) && <div className={styles.trailing}>{meta}{actions}</div>}
  </header>;
}
