import styles from "./ImageFrame.module.css";

export default function ImageFrame({ src, alt, className = "", loading = "lazy" }) {
  return <div className={`${styles.frame} ${className}`}>
    <img src={src} alt={alt} loading={loading} />
  </div>;
}
