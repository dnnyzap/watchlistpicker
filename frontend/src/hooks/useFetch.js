import { useState, useCallback } from 'react';

// Relativo: em dev o Vite faz proxy, no Docker o nginx faz proxy.
// Para backend em outro dominio (ex.: deploy), defina VITE_API_URL.
export const API = import.meta.env.VITE_API_URL || '/api';

export function useFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, { params = {}, body } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API}${endpoint}${qs ? `?${qs}` : ''}`, body === undefined ? undefined : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(dados?.erro || `Erro ${res.status} ao falar com o servidor.`);
      }
      return dados;
    } catch (err) {
      setError(err instanceof TypeError ? 'Servidor indisponível. O backend está rodando?' : err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((endpoint, params) => request(endpoint, { params }), [request]);
  const post = useCallback((endpoint, body) => request(endpoint, { body }), [request]);

  return { get, post, loading, error, setError };
}
