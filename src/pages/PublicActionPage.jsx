import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import PublicActionsPanel from '../components/PublicActionsPanel';
import styles from '../App.module.css';

export default function PublicActionPage() {
  const { actionId } = useParams();
  const { user, claims } = useAuth();
  return <main className={styles.page}><section className={styles.content}><div className={styles.mapSection}><p className={styles.eyebrow}>Inscrição em ação</p><h1>Quero participar</h1><p>Confira os dados da ação e entre ou crie sua conta de voluntário para confirmar a participação.</p></div><PublicActionsPanel actionId={actionId} user={user} claims={claims} /></section></main>;
}
