import { useEffect, useState } from 'react';
import { API } from './useFetch';

const AVISAR_APOS_MS = 2500;
const DESISTIR_APOS_MS = 120_000;
const INTERVALO_MS = 3000;

/**
 * Chama /health assim que a pagina abre, para acordar o backend (planos gratis dormem sem uso).
 * Estado: 'verificando' → 'ok', ou 'acordando' se demorar, ou 'fora' se nao responder em 2 minutos.
 */
export function useServidor() {
  const [estado, setEstado] = useState('verificando');

  useEffect(() => {
    let ativo = true;
    let proxima;
    const inicio = Date.now();
    const aviso = setTimeout(() => setEstado((e) => (e === 'verificando' ? 'acordando' : e)), AVISAR_APOS_MS);

    const tentar = async () => {
      try {
        const res = await fetch(`${API}/health`);
        if (res.ok) {
          if (ativo) setEstado('ok');
          return;
        }
      } catch {
        // servidor ainda subindo
      }
      if (!ativo) return;
      if (Date.now() - inicio > DESISTIR_APOS_MS) {
        setEstado('fora');
        return;
      }
      setEstado('acordando');
      proxima = setTimeout(tentar, INTERVALO_MS);
    };
    tentar();

    return () => {
      ativo = false;
      clearTimeout(aviso);
      clearTimeout(proxima);
    };
  }, []);

  return estado;
}
