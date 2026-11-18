import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { USUARIO_EXEMPLO, sortearDemo } from '../demo/dados';
import './Sorteador.css';

export default function Sorteador({ modo, user, setUser }) {
  const [filme, setFilme] = useState(null);
  const { get, post, loading, error, setError } = useFetch();
  const recente = modo === 'recente';

  const sortear = async (u) => {
    if (!u) return;
    const data = await get(recente ? '/sortear-recente' : '/sortear', { user: u });
    if (data) setFilme(data);
  };

  const sortearExemplo = async () => {
    const sorteado = sortearDemo(modo);
    const imagens = await post('/imagens', [{ titulo: sorteado.titulo, ano: sorteado.ano }]);
    setFilme({ ...sorteado, ...(imagens?.[0] || {}), demo: true });
  };

  const usarExemplo = () => {
    setUser(USUARIO_EXEMPLO);
    setError(null);
    sortear(USUARIO_EXEMPLO);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sortear(user.trim());
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
            {loading ? 'Sorteando...' : filme && !filme.demo ? 'Sortear outro' : 'Sortear'}
          </button>
        </form>

        <div className="atalhos">
          {USUARIO_EXEMPLO && (
            <button type="button" className="atalho" onClick={usarExemplo} disabled={loading}>
              Testar com @{USUARIO_EXEMPLO}
            </button>
          )}
          <button type="button" className="atalho" onClick={sortearExemplo} disabled={loading}>
            {filme?.demo ? 'Sortear outro exemplo' : 'Não tem Letterboxd? Ver com dados de exemplo'}
          </button>
        </div>

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
              {filme.demo && <span className="selo-demo">Exemplo</span>}
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
