import { useNavigate } from "react-router-dom";
import styles from "../../styles/Banner.module.css";
import Button from "./Button";

export default function Banner({
  image,
  title, // agora pode ser string ou JSX
  as = "h1",
  buttonText,
  buttonLink,
  buttonVariant = "secondary",
  ariaLabel,
  imagePosition = "center",
  height = "200px",
  children, // opcional, caso queira passar conteúdo customizado
}) {
  const navigate = useNavigate();
  const Tag = as;

  const handleClick = () => {
    if (buttonLink) navigate(buttonLink);
  };

  return (
    <div
      role="img"
      aria-label={ariaLabel || (typeof title === "string" ? title : "")}
      className={styles.bannerHorizontal}
      style={{ height }}
    >
      {/* Imagem à esquerda */}
      <div className={styles.bannerImageContainer}>
        <img
          src={image}
          alt=""
          className={styles.bannerImage}
          style={{ objectPosition: imagePosition, maxHeight: height }}
        />
      </div>

      {/* Conteúdo à direita */}
      <div className={styles.bannerContent}>
        {/* Se children existir, renderiza ele; caso contrário, renderiza title */}
        {children ? (
          children
        ) : (
          <Tag className={styles.bannerTitle}>
            {typeof title === "string" ? title : title}
          </Tag>
        )}

        {/* Botão opcional */}
        {buttonText && buttonLink && (
          <Button variant={buttonVariant} onClick={handleClick}>
            {buttonText}
          </Button>
        )}
      </div>
    </div>
  );
}
