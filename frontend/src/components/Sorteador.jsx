import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import './Sorteador.css';

export default function Sorteador({ modo, user, setUser }) {
  const [filme, setFilme] = useState(null);
  const { get, loading, error, setError } = useFetch();
  const recente = modo === 'recente';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user.trim()) return;
    const data = await get(recente ? '/sortear-recente' : '/sortear', { user: user.trim() });
    if (data) setFilme(data);
  };

  const bg = filme?.bannerUrl || filme?.posterUrl;

  return (
    <div className="sorteador" style={{ backgroundImage: bg ? `url(${bg})` : 'none' }}>
      <div className="sorteador-overlay" />
      <div className="sorteador-content">
        <h1 className="sorteador-title">
          {recente ? 'Sorteador de Recentes' : 'Sorteador de Watchlist'}
        </h1>
        <p className="sorteador-sub">
          {recente
            ? 'Sorteia um filme entre os que você assistiu por último'
            : 'Sorteia um filme aleatório da sua watchlist'}
        </p>

        <form onSubmit={handleSubmit} className="sorteador-form">
          <input
            type="text"
            placeholder="Usuário do Letterboxd"
            value={user}
            onChange={(e) => { setUser(e.target.value); setError(null); }}
            className="sorteador-input"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={loading || !user.trim()} className="sorteador-btn">
            {loading ? 'Sorteando...' : filme ? 'Sortear outro' : 'Sortear'}
          </button>
        </form>

        {error && <div className="sorteador-error">{error}</div>}

        {filme && (
          <div className={`filme-card${loading ? ' carregando' : ''}`}>
            <div className="filme-poster-wrap">
              {filme.posterUrl ? (
                <img src={filme.posterUrl} alt={filme.titulo} className="filme-poster" />
              ) : (
                <div className="filme-poster-placeholder">{filme.titulo}</div>
              )}
            </div>
            <div className="filme-info">
              <h2 className="filme-titulo">
                {filme.titulo}
                {filme.ano && <span className="filme-ano"> ({filme.ano})</span>}
              </h2>
              <a href={filme.url} target="_blank" rel="noreferrer" className="filme-link">
                Ver no Letterboxd →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
