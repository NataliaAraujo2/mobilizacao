import { useState } from 'react';
import styles from './ListSearch.module.css';

export default function ListSearch({ label = 'Buscar por nome', placeholder = 'Digite para pesquisar', initialValue = '', onSearch, disabled = false }) {
  const [value, setValue] = useState(initialValue);
  function submit(event) { event.preventDefault(); onSearch(value.trim()); }
  function clear() { setValue(''); onSearch(''); }
  return <form className={styles.form} role="search" onSubmit={submit}>
    <label>{label}<input value={value} onChange={event => setValue(event.target.value)} placeholder={placeholder} disabled={disabled} /></label>
    <button type="submit" disabled={disabled}>Buscar</button>
    {value && <button type="button" className={styles.clear} onClick={clear} disabled={disabled}>Limpar</button>}
  </form>;
}
