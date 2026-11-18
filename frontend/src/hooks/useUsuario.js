import { useState } from 'react';

const CHAVE = 'letterboxd-user';

function ler() {
  try { return localStorage.getItem(CHAVE) || ''; } catch { return ''; }
}

/** Usuario do Letterboxd compartilhado entre as abas e lembrado entre visitas. */
export function useUsuario() {
  const [user, setUserState] = useState(ler);
  const setUser = (valor) => {
    setUserState(valor);
    try { localStorage.setItem(CHAVE, valor.trim()); } catch { /* storage indisponivel */ }
  };
  return [user, setUser];
}
