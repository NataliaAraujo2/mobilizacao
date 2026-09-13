import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import growingPlant from "../assets/brand/elements/elemento-03.webp";
import styles from "./DashboardPage.module.css";
import { completeSuperAdminPasswordChange } from "../services/branchViewersService";

const ADMIN_ACTIONS = [
  { to: "/admin/formularios", code: "FO", title: "Formulários por link", description: "Crie formulários, envie links e revise respostas individualmente." },
  { to: "/admin/contador-associados", code: "+1", title: "Novos associados", description: "Atualize o contador exibido na pré-home.", featured: true },
  { to: "/admin/relatorio-2025", code: "PDF", title: "Relatório 2025", description: "Arquive a versão comprimida para leitura e impressão pública." },
  { to: "/admin/acoes", code: "AC", title: "Ações", description: "Cadastre locais, orientações, fotos e informações de cada mobilização.", featured: true },
  { to: "/admin/voluntarios", code: "VO", title: "Voluntários", description: "Cadastre e organize os dados das pessoas participantes." },
  { to: "/admin/presencas", code: "✓", title: "Listas de presença", description: "Consulte presenças e ausências por regional e ação." },
  { to: "/admin/regionais", code: "RE", title: "Regionais", description: "Gerencie as regionais e seus estados de atuação." },
  { to: "/admin/acessos-consulta", code: "PE", title: "Acessos das regionais", description: "Crie e acompanhe os acessos de consulta de cada regional." },
  { to: "/admin/superadmins", code: "SA", title: "SuperAdmins", description: "Autorize novos administradores nacionais." },
];

function friendlyName(user, isSuperAdmin) {
  if (user?.displayName) return user.displayName;
  return isSuperAdmin ? "Administração nacional" : "Voluntário";
}

export default function DashboardPage({ area }) {
  const { user, claims } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const isSuperAdmin = claims?.role === "superAdmin";
  const isAdminArea = area === "admin" && isSuperAdmin;

  return (
    <main className={styles.page}>
      <section className={styles.dashboard} aria-labelledby="dashboard-title">
        <header className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <p className={styles.eyebrow}>{isAdminArea ? "Administração nacional" : "Área do voluntário"}</p>
            <h1 id="dashboard-title">Olá, {friendlyName(user, isSuperAdmin)}</h1>
            <p>{isAdminArea ? "Acompanhe e organize a MobilizAÇÃO em todo o Brasil." : "Consulte aqui as informações da sua participação."}</p>
            <div className={styles.statuses} aria-label="Informações do acesso">
              <span><i aria-hidden="true" /> Conta ativa</span>
              <span>{isAdminArea ? "Acesso a todas as regionais" : `Regional ${claims?.branchId ?? "não vinculada"}`}</span>
            </div>
          </div>
          <img src={growingPlant} alt="" aria-hidden="true" />
        </header>

        {isAdminArea ? (
          <section className={styles.section} aria-labelledby="resources-title">
            {claims?.mustChangePassword && <form onSubmit={async (event) => { event.preventDefault(); setPasswordMessage(""); try { await completeSuperAdminPasswordChange(newPassword); setPasswordMessage("Senha alterada com sucesso."); } catch { setPasswordMessage("Não foi possível alterar a senha."); } }}><h2>Defina sua senha pessoal</h2><p>Por segurança, altere a senha temporária antes de continuar.</p><input type="password" minLength="10" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nova senha (mínimo 10 caracteres)" /><button type="submit">Salvar nova senha</button>{passwordMessage && <p role="status">{passwordMessage}</p>}</form>}
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Acessos rápidos</p>
                <h2 id="resources-title">O que deseja fazer?</h2>
              </div>
              <Link className={styles.publicLink} to="/">Ver página pública <span aria-hidden="true">↗</span></Link>
            </div>

            <nav className={styles.actionGrid} aria-label="Recursos administrativos">
              {ADMIN_ACTIONS.map((action) => (
                <Link key={action.to} className={action.featured ? styles.featuredAction : styles.action} to={action.to}>
                  <span className={styles.actionIcon} aria-hidden="true">{action.code}</span>
                  <span className={styles.actionCopy}>
                    <strong>{action.title}</strong>
                    <small>{action.description}</small>
                  </span>
                  <span className={styles.arrow} aria-hidden="true">→</span>
                </Link>
              ))}
            </nav>
          </section>
        ) : (
          <section className={styles.emptyState}>
            <p className={styles.eyebrow}>Em construção</p>
            <h2>Sua área está sendo preparada</h2>
            <p>Em breve você encontrará aqui orientações, avisos e informações das ações.</p>
            <Link to="/">Voltar para a página inicial</Link>
          </section>
        )}
      </section>
    </main>
  );
}
