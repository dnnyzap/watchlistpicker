import { useState, useCallback } from 'react';

// Relativo: em dev o Vite faz proxy, no Docker o nginx faz proxy.
// Para backend em outro dominio (ex.: deploy), defina VITE_API_URL.
const API = import.meta.env.VITE_API_URL || '/api';

export function useFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const get = useCallback(async (endpoint, params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API}${endpoint}${qs ? `?${qs}` : ''}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.erro || `Erro ${res.status} ao falar com o servidor.`);
      }
      return body;
    } catch (err) {
      setError(err instanceof TypeError ? 'Servidor indisponível. O backend está rodando?' : err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { get, loading, error, setError };
}
