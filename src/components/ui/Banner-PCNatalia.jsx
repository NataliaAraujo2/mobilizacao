// src/components/ui/Banner.jsx
import styles from "../../styles/Banner.module.css";

export default function Banner({
  image,
  title,
  ariaLabel,
  imagePosition = "center",
  height,
}) {
  // garante que images seja um array
  const images = Array.isArray(image) ? image : [image];

  return (
    <section
      aria-label={ariaLabel || (typeof title === "string" ? title : "")}
      className={styles.banner}
      style={{ height: height || "auto" }}
    >
      {/* título acima */}
      {title && <h1 className={styles.bannerTitle}>{title}</h1>}

      {/* grade de imagens */}
      <div className={styles.imageGrid}>
        {images.map((img, index) => (
          <img
            key={index}
            src={img}
            alt=""
            className={styles.bannerImage}
            style={{ objectPosition: imagePosition }}
          />
        ))}
      </div>
    </section>
  );
}
