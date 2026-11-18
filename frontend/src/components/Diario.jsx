import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import './Diario.css';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Diario({ user, setUser }) {
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState(() => new Date().getMonth() + 1);
  const [busca, setBusca] = useState(null); // { filmes, ano, mes } da ultima busca; null = ainda nao buscou
  const { get, loading, error, setError } = useFetch();

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!user.trim()) return;
    setBusca(null);
    const data = await get('/diario', { user: user.trim(), ano, mes });
    if (data) setBusca({ filmes: data, ano, mes });
  };

  const filmes = busca?.filmes;

  return (
    <div className="diario">
      <div className="diario-header">
        <h1 className="diario-title">📅 Diário Mensal</h1>
        <p className="diario-sub">Veja todos os filmes assistidos em um mês</p>
      </div>

      <form onSubmit={handleBuscar} className="diario-form">
        <input type="text" placeholder="Usuário Letterboxd" value={user}
          onChange={(e) => { setUser(e.target.value); setError(null); }}
          className="diario-input" autoComplete="off" spellCheck={false} />
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="diario-select">
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))}
          min="2000" max="2100" className="diario-input diario-ano" />
        <button type="submit" disabled={loading || !user.trim()} className="diario-btn">
          {loading ? 'Buscando...' : '🔍 Buscar'}
        </button>
      </form>

      <p className="diario-aviso">
        O Letterboxd só libera os ~50 registros mais recentes, então meses antigos podem não aparecer.
      </p>

      {error && <div className="diario-error">⚠️ {error}</div>}

      {filmes?.length > 0 && (
        <>
          <p className="diario-contagem">
            {filmes.length} {filmes.length === 1 ? 'filme' : 'filmes'} em {MESES[busca.mes - 1]} de {busca.ano}
          </p>
          <div className="diario-grid">
            {filmes.map((f, i) => (
              <a key={`${f.url}-${i}`} href={f.url} target="_blank" rel="noreferrer" className="diario-card"
                title={f.ano ? `${f.titulo} (${f.ano})` : f.titulo}>
                {f.posterUrl ? (
                  <img src={f.posterUrl} alt={f.titulo} className="diario-poster" loading="lazy" />
                ) : (
                  <div className="diario-placeholder"><span>🎬</span><small>{f.titulo}</small></div>
                )}
                <div className="diario-overlay"><span className="diario-card-titulo">{f.titulo}</span></div>
              </a>
            ))}
          </div>
        </>
      )}

      {!loading && filmes?.length === 0 && (
        <div className="diario-empty"><span>🍿</span><p>Nenhum filme neste período</p></div>
      )}
    </div>
  );
}
