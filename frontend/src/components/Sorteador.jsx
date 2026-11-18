import { useEffect, useRef, useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { USUARIO_EXEMPLO } from '../demo/dados';
import './Sorteador.css';

const FONTES = [
  { id: 'watchlist', rotulo: 'Watchlist', rota: '/sortear', origem: (u) => `da watchlist de @${u}` },
  { id: 'assistidos', rotulo: 'Assistidos', rota: '/sortear-assistidos', origem: (u) => `dos filmes que @${u} assistiu` },
  { id: 'recentes', rotulo: 'Recentes', rota: '/sortear-recente', origem: (u) => `dos registros recentes de @${u}` },
  { id: 'lista', rotulo: 'Lista', rota: '/sortear-lista' },
];

const DICAS = {
  watchlist: 'Um filme aleatório da sua watchlist.',
  assistidos: 'Um filme que você já viu, para rever.',
  recentes: 'Um dos ~50 filmes que você registrou por último.',
  lista: 'Cole o link de qualquer lista pública do Letterboxd.',
};

/** Listas publicas do Letterboxd, para quem nao tem conta. */
const COLECOES = [
  { nome: 'Top 500 do Letterboxd', lista: 'official/list/letterboxds-top-500-films' },
  { nome: 'Os com mais fãs', lista: 'official/list/top-250-films-with-the-most-fans' },
  { nome: 'Animação', lista: 'official/list/top-250-animated-films' },
  { nome: '1001 filmes para ver antes de morrer', lista: 'peterstanley/list/1001-movies-you-must-see-before-you-die' },
  { nome: 'Terror essencial', lista: 'browsehorror/list/horror-movies-everyone-should-watch-at-least' },
];

function duracao(min) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}

export default function Sorteador({ user, setUser }) {
  const [fonte, setFonte] = useState('watchlist');
  const [link, setLink] = useState('');
  const [filme, setFilme] = useState(null);
  const [ultimo, setUltimo] = useState(null); // { rota, params, origem } do ultimo sorteio
  const [sinopseAberta, setSinopseAberta] = useState(false);
  const { get, loading, error, setError } = useFetch();
  const resultadoRef = useRef(null);

  // No celular o resultado fica abaixo da dobra: rola ate ele a cada sorteio.
  useEffect(() => {
    if (filme) resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [filme]);

  const atual = FONTES.find((f) => f.id === fonte);
  const porLista = fonte === 'lista';
  const valor = porLista ? link : user;

  const sortear = async (pedido) => {
    const data = await get(pedido.rota, pedido.params);
    if (data) {
      setFilme(data);
      setUltimo(pedido);
      setSinopseAberta(false);
    }
  };

  const sortearDaFonte = (u = user.trim()) => {
    if (porLista) {
      const l = link.trim();
      if (l) sortear({ rota: atual.rota, params: { lista: l }, origem: 'da lista que você colou' });
    } else if (u) {
      sortear({ rota: atual.rota, params: { user: u }, origem: atual.origem(u) });
    }
  };

  const sortearColecao = (c) =>
    sortear({ rota: '/sortear-lista', params: { lista: c.lista }, origem: `da lista ${c.nome}` });

  const usarExemplo = () => {
    setUser(USUARIO_EXEMPLO);
    sortearDaFonte(USUARIO_EXEMPLO);
  };

  const trocarFonte = (id) => {
    setFonte(id);
    setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sortearDaFonte();
  };

  const det = filme?.detalhes;
  const meta = [filme?.ano, duracao(det?.duracao), det?.pais].filter(Boolean);
  const bg = filme?.bannerUrl || filme?.posterUrl;

  return (
    <div className="sorteador">
      {bg && <div className="sorteador-fundo" style={{ backgroundImage: `url(${bg})` }} />}
      <div className="sorteador-conteudo">
        <header className="sorteador-cabecalho">
          <h1 className="sorteador-titulo">O que assistir hoje?</h1>
          <p className="sorteador-dica">{DICAS[fonte]}</p>
        </header>

        <div className="segmentado sorteador-fontes" role="tablist">
          {FONTES.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={fonte === f.id}
              className={fonte === f.id ? 'ativo' : ''} onClick={() => trocarFonte(f.id)}>
              {f.rotulo}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="sorteador-form">
          <input
            type={porLista ? 'url' : 'text'}
            inputMode={porLista ? 'url' : 'text'}
            placeholder={porLista ? 'letterboxd.com/usuario/list/nome-da-lista' : 'Usuário do Letterboxd'}
            value={valor}
            onChange={(e) => { (porLista ? setLink : setUser)(e.target.value); setError(null); }}
            className="sorteador-input"
            autoComplete="off"
            spellCheck={false}
            aria-label={porLista ? 'Link da lista' : 'Usuário do Letterboxd'}
          />
          <button type="submit" disabled={loading || !valor.trim()} className="botao-primario">
            {loading ? 'Sorteando…' : 'Sortear'}
          </button>
        </form>

        {!porLista && USUARIO_EXEMPLO && (
          <button type="button" className="atalho" onClick={usarExemplo} disabled={loading}>
            Testar com @{USUARIO_EXEMPLO}
          </button>
        )}

        <section className="colecoes" aria-label="Listas públicas">
          <p className="colecoes-rotulo">Sem conta? Sorteie de uma lista pública</p>
          <div className="colecoes-lista">
            {COLECOES.map((c) => (
              <button key={c.lista} type="button" className="colecao" onClick={() => sortearColecao(c)}
                disabled={loading}>
                {c.nome}
              </button>
            ))}
          </div>
        </section>

        {error && <div className="sorteador-erro" role="alert">{error}</div>}

        {filme && (
          <article ref={resultadoRef} className={`resultado${loading ? ' carregando' : ''}`} aria-live="polite">
            <a href={filme.url} target="_blank" rel="noreferrer" className="resultado-poster">
              {filme.posterUrl
                ? <img src={filme.posterUrl} alt={`Pôster de ${filme.titulo}`} />
                : <span className="resultado-poster-vazio">{filme.titulo}</span>}
            </a>

            <div className="resultado-info">
              {ultimo && <p className="resultado-origem">Sorteado {ultimo.origem}</p>}
              <h2 className="resultado-titulo">{filme.titulo}</h2>
              {meta.length > 0 && <p className="resultado-meta">{meta.join(' · ')}</p>}
              {det?.diretor && <p className="resultado-diretor">Direção de {det.diretor}</p>}

              {(det?.notaMedia || det?.generos?.length > 0) && (
                <div className="resultado-etiquetas">
                  {det.notaMedia && (
                    <span className="nota" title="Nota média no Letterboxd">
                      ★ {det.notaMedia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                  )}
                  {det.generos?.map((g) => <span key={g} className="genero">{g}</span>)}
                </div>
              )}

              {det?.tagline && <p className="resultado-tagline">{det.tagline}</p>}
              {det?.sinopse && (
                <p className={`resultado-sinopse${sinopseAberta ? ' aberta' : ''}`}
                  onClick={() => setSinopseAberta((a) => !a)}>
                  {det.sinopse}
                </p>
              )}

              <div className="resultado-acoes">
                <button type="button" className="botao-primario" onClick={() => sortear(ultimo)}
                  disabled={loading || !ultimo}>
                  {loading ? 'Sorteando…' : 'Sortear outro'}
                </button>
                <a href={filme.url} target="_blank" rel="noreferrer" className="botao-secundario">
                  Abrir no Letterboxd
                </a>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
