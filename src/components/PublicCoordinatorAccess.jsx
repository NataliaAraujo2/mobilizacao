import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import styles from './PublicCoordinatorAccess.module.css';

export default function PublicCoordinatorAccess() {
  const { user, loading } = useAuth();
  if (loading || user) return null;
  return <footer className={styles.footer}>
    <span>Você faz parte de uma coordenação estadual?</span>
    <Link to="/admin/login">Acesso da coordenação</Link>
  </footer>;
}
