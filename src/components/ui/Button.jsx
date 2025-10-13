import styles from "../../styles/Button.module.css";

export default function Button({ children, variant = "primary", href, ...props }) {
  // Se href começar com #, transformamos em scroll interno
  const handleClick = (e) => {
    if (href?.startsWith("#")) {
      e.preventDefault();
      const section = document.querySelector(href);
      section?.scrollIntoView({ behavior: "smooth" });
    }
    if (props.onClick) props.onClick(e);
  };

  // Renderiza sempre <button> para âncoras internas
  const isAnchor = href?.startsWith("#");
  const Component = isAnchor ? "button" : href ? "a" : "button";

  return (
    <Component
      className={`${styles.button} ${styles[variant]}`}
      {...(isAnchor ? {} : { href })}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Component>
  );
}