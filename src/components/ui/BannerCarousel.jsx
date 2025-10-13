import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/BannerCarousel.module.css";
import Button from "./Button";

export default function BannerCarousel({ slides, interval = 5000 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [slides.length, interval, paused]);

  const handleClick = (link) => {
    if (link) navigate(link);
  };

  return (
    <div
      role="img"
      aria-label={
        typeof slides[index].title === "string"
          ? slides[index].title
          : slides[index].ariaLabel
      }
      className={styles.banner}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 🔹 Imagem como <img>, não mais background */}
      <img
        src={slides[index].image}
        alt={slides[index].ariaLabel || "banner"}
        className={styles.bannerImage}
      />

      <div className={styles.content}>
        {slides[index].title && (
          <div className={styles.bannerTitle}>{slides[index].title}</div>
        )}

        {slides[index].buttonText && slides[index].buttonLink && (
          <Button
            variant={slides[index].buttonVariant || "secondary"}
            onClick={() => handleClick(slides[index].buttonLink)}
          >
            {slides[index].buttonText}
          </Button>
        )}
      </div>

      {/* navegação manual */}
      <div className={styles.dots}>
        {slides.map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i === index ? styles.active : ""}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
