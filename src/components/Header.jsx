// src/components/Header.jsx
import React, { useState, useRef, useEffect } from "react";
import { FaLock } from "react-icons/fa";
import styles from "../styles/Header.module.css";
import logo from "../assets/logo.png";
import { useAuth } from "../hooks/useAuth";
import Button from "./ui/Button";
import { useNavigate } from "react-router-dom";

export default function Header({ anchorLinks = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Fecha menu ao clicar fora ou pressionar ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuOpen &&
        navRef.current &&
        !navRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  // Foco ao abrir/fechar menu
  useEffect(() => {
    if (menuOpen && navRef.current) {
      const firstLink = navRef.current.querySelector("button");
      firstLink?.focus();
    } else {
      buttonRef.current?.focus();
    }
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((s) => !s);

  // Rola suavemente para âncora
  const handleAnchorClick = (id) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  // Navega até o topo e reseta rolagem
  const handleBrandClick = () => {
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Navega para dashboard
  const handleDashboardClick = () => {
    navigate("/login");
    setMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      {/* === LOGO / BRAND === */}
      <div
        className={styles.brand}
        onClick={handleBrandClick}
        style={{ cursor: "pointer" }}
      >
        <img
          src={logo}
          alt="Logotipo ONG Moradia e Cidadania"
          className={styles.logo}
        />
      </div>

      {/* === BOTÃO HAMBURGUER === */}
      <button
        ref={buttonRef}
        className={`${styles.hamburger} ${menuOpen ? styles.open : ""}`}
        onClick={toggleMenu}
        aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={menuOpen}
        aria-controls="main-nav"
      >
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </button>

      {/* === MENU DE NAVEGAÇÃO === */}
      <nav
        id="main-nav"
        ref={navRef}
        className={`${styles.nav} ${menuOpen ? styles.active : ""}`}
        role="navigation"
        aria-label="Navegação principal"
      >
        <ul className={styles.navList}>
          <li className={styles.navItem}>
            <Button variant="secondary" onClick={handleBrandClick}>
              Início
            </Button>
          </li>
          {anchorLinks.map((link) => (
            <li key={link.label} className={styles.navItem}>
              <Button
                variant="secondary"
                onClick={() => handleAnchorClick(link.href)}
              >
                {link.label}
              </Button>
            </li>
          ))}

          {/* === ÁREA RESTRITA === */}
          {!user ? (
            <li className={`${styles.navItem} ${styles.restricted}`}>
              <Button variant="primary" onClick={handleDashboardClick}>
                <FaLock className={styles.lockIcon} /> Área Restrita
              </Button>
            </li>
          ) : (
            <li className={`${styles.navItem} ${styles.restricted}`}>
              <Button variant="secondary" onClick={logout}>
                Sair
              </Button>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
