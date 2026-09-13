import { useNavigate } from 'react-router-dom';
import styles from './BackButton.module.css';

export default function BackButton({ fallback = '/admin' }) {
  const navigate = useNavigate();
  function goBack() {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }
  return <div className={styles.container}><button type="button" className={styles.button} onClick={goBack} aria-label="Voltar uma página">← Voltar</button></div>;
}
