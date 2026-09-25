import { Link } from "react-router-dom";
import mobilizacaoLogo from "../assets/brand/mobilizacao-logo-colorido.webp";
import styles from "./Footer.module.css";

const links = [
  { label: "Página inicial", to: "/" },
  { label: "Edição 2025", to: "/2025" },
  { label: "Acesso do voluntário", to: "/login" },
  { label: "Acesso da coordenação", to: "/admin/login" },
];

const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/moradiaecidadania.nacional/", className: "facebook" },
  { label: "Instagram", href: "https://www.instagram.com/moradiaecidadania.nacional/", className: "instagram" },
  { label: "YouTube", href: "https://www.youtube.com/@ongmoradiaecidadania", className: "youtube" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <section className={styles.brand} aria-label="MobilizAÇÃO">
          <img src={mobilizacaoLogo} alt="MobilizAÇÃO — ONG Moradia e Cidadania" width="1400" height="1466" />
          <p>Mobilizando pessoas para transformar comunidades em todo o Brasil.</p>
        </section>

        <nav className={styles.navigation} aria-label="Links do rodapé">
          <h2>Navegação</h2>
          <ul>
            {links.map(({ label, to }) => <li key={to}><Link to={to}>{label}</Link></li>)}
          </ul>
        </nav>

        <section className={styles.contact} aria-labelledby="footer-contact-title">
          <h2 id="footer-contact-title">ONG Moradia e Cidadania</h2>
          <address>
            Ed. Ceará, Setor Comercial Sul, Q. 1, Bloco E, Lote 30, Sala 913<br />
            Brasília/DF
          </address>
          <p className={styles.phone}>☎ <span>(61) 3224-8071</span></p>
          <a href="mailto:comunicacao@moradiaecidadania.org.br">comunicacao@moradiaecidadania.org.br</a>
          <div className={styles.socials} aria-label="Redes sociais">
            {socialLinks.map(({ label, href, className }) => (
              <a key={label} className={styles[className]} href={href} target="_blank" rel="noreferrer" aria-label={`ONG Moradia e Cidadania no ${label}`}>{label}</a>
            ))}
          </div>
        </section>
      </div>
      <div className={styles.copyright}>© {new Date().getFullYear()} ONG Moradia e Cidadania. Todos os direitos reservados.</div>
    </footer>
  );
}
