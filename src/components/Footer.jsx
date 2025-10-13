// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import styles from "../styles/Footer.module.css";
import {
  FaYoutube,
  FaInstagram,
  FaFacebook,
  FaGlobe,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";

export default function Footer() {
  const youtube = "https://www.youtube.com/@ongmoradiaecidadania";
  const instagram = "https://www.instagram.com/moradiaecidadania.nacional/";
  const facebook = "https://www.facebook.com/moradiaecidadania.nacional/";
  const site = "https://moradiaecidadania.org.br/";
  const endereco =
    "Ed. Ceará, Setor Comercial Sul Q. 1 Bloco E Lote 30 Sala 913 - Brasília/DF";
  const telefone = "(61) 3224-8071";
  const email = "comunicacao@moradiaecidadania.org.br";

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Coluna logo e direitos */}
        <div className={styles.brand}>
          <h2>MobilizAção</h2>
          
            <p>
              &copy; {new Date().getFullYear()} Todos os direitos reservados.
            </p>
     
        </div>

        {/* Navegação */}
        <nav aria-label="Links do rodapé">
          <ul className={styles.navList}>
            <li>
              <Link to="/sobre">Sobre</Link>
            </li>
            <li>
              <Link to="/parceiros">Parceiros</Link>
            </li>
            <li>
              <Link to="/voluntarios">Voluntários</Link>
            </li>
            <li>
              <Link to="/coordenacoes">Coordenações</Link>
            </li>
          </ul>
        </nav>

        {/* Informações institucionais */}
        <div className={styles.info}>
          <ul>
            <li>
              <a href={site} target="_blank" rel="noopener noreferrer">
                <FaGlobe /> {site.replace("https://", "")}
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`}>
                <FaEnvelope /> {email}
              </a>
            </li>
            <li>
              <a href={`tel:${telefone.replace(/\D/g, "")}`}>
                <FaPhone /> {telefone}
              </a>
            </li>
            <li>
              <FaMapMarkerAlt /> {endereco}
            </li>
          </ul>

          {/* Redes sociais */}
          <div className={styles.socials}>
            <a href={facebook} target="_blank" rel="noopener noreferrer">
              <FaFacebook color="#1877F2" />
            </a>
            <a href={instagram} target="_blank" rel="noopener noreferrer">
              <FaInstagram color="#E4405F" />
            </a>
            <a href={youtube} target="_blank" rel="noopener noreferrer">
              <FaYoutube color="#FF0000" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
