import { useRef, useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import StoryDiario from '../story/StoryDiario';
import { MESES } from '../story/desenharStory';
import { montarStory } from '../diario/selecionar';
import { carregarExportSalvo, lerExport, salvarExport } from '../diario/exportLetterboxd';
import { USUARIO_DEMO, USUARIO_EXEMPLO, diarioDemo } from '../demo/dados';
import './Diario.css';

const PERIODOS = [
  { id: 'mes', rotulo: 'Mês' },
  { id: 'ano', rotulo: 'Ano' },
];

const formatarData = (iso) => iso.split('-').reverse().join('/');
const doisDigitos = (n) => String(n).padStart(2, '0');

function doPeriodo(entradas, { periodo, ano, mes }) {
  const prefixo = periodo === 'mes' ? `${ano}-${doisDigitos(mes)}-` : `${ano}-`;
  return entradas.filter((f) => f.data.startsWith(prefixo));
}

export default function Diario({ user, setUser }) {
  const [periodo, setPeriodo] = useState('mes');
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState(() => new Date().getMonth() + 1);
  const [exportado, setExportado] = useState(carregarExportSalvo);
  const [demo, setDemo] = useState(false);
  const [erroImport, setErroImport] = useState(null);
  const [resultado, setResultado] = useState(null); // { story, user, nomeArquivo, aviso }
  const { get, post, loading, error, setError } = useFetch();
  const inputArquivo = useRef(null);

  const usuarioStory = demo ? USUARIO_DEMO : user.trim() || exportado?.usuario || '';

  const importar = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErroImport(null);
    try {
      const dados = await lerExport(arquivo);
      if (!dados.entradas.length) throw new Error('O diário desse export está vazio.');
      setExportado(dados);
      salvarExport(dados);
      setDemo(false);
      setResultado(null);
      if (!user.trim() && dados.usuario) setUser(dados.usuario);
    } catch (err) {
      setErroImport(err.message || 'Não consegui ler esse arquivo.');
    }
  };

  const remover = () => {
    setExportado(null);
    salvarExport(null);
    setResultado(null);
  };

  const filmesDoRss = async (u, sel) => {
    const params = sel.periodo === 'mes' ? { user: u, ano: sel.ano, mes: sel.mes } : { user: u, ano: sel.ano };
    const dados = await get('/diario', params);
    if (!dados) return null;
    const nomePeriodo = sel.periodo === 'mes' ? 'mês' : 'ano';
    const aviso = dados.incompleto
      ? `O Letterboxd só liberou seus registros a partir de ${formatarData(dados.desde)}. `
        + `Para o ${nomePeriodo} completo, importe seu export.`
      : null;
    // A API devolve do mais recente para o mais antigo; o story fica em ordem cronologica.
    return { filmes: [...dados.filmes].reverse(), aviso };
  };

  /** `fonte`: 'demo', 'export' ou 'rss'. `sel`: { periodo, ano, mes }. */
  const gerarStory = async (fonte, u, sel) => {
    setResultado(null);
    let dados;
    if (fonte === 'demo') dados = { filmes: doPeriodo(diarioDemo(), sel), aviso: null };
    else if (fonte === 'export') dados = { filmes: doPeriodo(exportado.entradas, sel), aviso: null };
    else dados = await filmesDoRss(u, sel);
    if (!dados) return;

    const story = montarStory({ filmes: dados.filmes, ...sel });

    // Filmes do export (e do exemplo) nao tem poster: busca no TMDB so os que vao aparecer.
    const semPoster = story.filmes.filter((f) => !f.posterUrl);
    if (semPoster.length) {
      const imagens = await post('/imagens', semPoster.map(({ titulo, ano: a }) => ({ titulo, ano: a })));
      if (!imagens) return;
      const porFilme = new Map(semPoster.map((f, i) => [f, imagens[i]]));
      story.filmes = story.filmes.map((f) => (porFilme.has(f) ? { ...f, ...porFilme.get(f) } : f));
    }

    const sufixo = sel.periodo === 'mes' ? `${sel.ano}-${doisDigitos(sel.mes)}` : String(sel.ano);
    setResultado({
      story,
      user: u,
      nomeArquivo: `${sel.periodo === 'mes' ? 'diario' : 'retrospectiva'}-${u}-${sufixo}.png`,
      aviso: dados.aviso,
    });
  };

  const fonteAtual = demo ? 'demo' : exportado ? 'export' : 'rss';

  const gerar = (e) => {
    e.preventDefault();
    if (!usuarioStory) return;
    gerarStory(fonteAtual, usuarioStory, { periodo, ano, mes });
  };

  const verExemplo = () => {
    const hoje = new Date();
    const sel = { periodo: 'mes', ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
    setDemo(true);
    setError(null);
    setPeriodo(sel.periodo);
    setAno(sel.ano);
    setMes(sel.mes);
    gerarStory('demo', USUARIO_DEMO, sel);
  };

  const usarUsuarioExemplo = () => {
    setUser(USUARIO_EXEMPLO);
    setDemo(false);
    setError(null);
    gerarStory(exportado ? 'export' : 'rss', USUARIO_EXEMPLO, { periodo, ano, mes });
  };

  const sairDoExemplo = () => {
    setDemo(false);
    setResultado(null);
  };

  const primeiro = exportado?.entradas[0]?.data;
  const ultimo = exportado?.entradas.at(-1)?.data;

  return (
    <div className="diario">
      <div className="diario-header">
        <h1 className="diario-title">Diário</h1>
        <p className="diario-sub">Monte um story com os filmes que você viu no mês ou no ano</p>
      </div>

      <form onSubmit={gerar} className="diario-form">
        <input type="text" placeholder="Usuário Letterboxd" value={demo ? '' : user} disabled={demo}
          onChange={(e) => { setUser(e.target.value); setError(null); }}
          className="diario-input" autoComplete="off" spellCheck={false} />
        <div className="segmentado diario-periodo">
          {PERIODOS.map(({ id, rotulo }) => (
            <button key={id} type="button" className={periodo === id ? 'ativo' : ''} onClick={() => setPeriodo(id)}>
              {rotulo}
            </button>
          ))}
        </div>
        {periodo === 'mes' && (
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="diario-select">
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        )}
        <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))}
          min="2000" max="2100" className="diario-input diario-ano" />
        <button type="submit" disabled={loading || !usuarioStory} className="diario-btn">
          {loading ? 'Buscando...' : 'Gerar story'}
        </button>
      </form>

      <div className="diario-fonte">
        {demo ? (
          <p>
            <span className="selo-demo">Exemplo</span> Usando um diário de exemplo: os filmes são reais,
            mas notas e datas são fictícias. Troque o mês ou escolha &quot;Ano&quot; e gere de novo.
          </p>
        ) : exportado ? (
          <p>
            Usando seu export do Letterboxd: {exportado.entradas.length} registros,
            de {formatarData(primeiro)} a {formatarData(ultimo)}.
          </p>
        ) : (
          <p>
            Sem o export, o Letterboxd só libera os ~50 registros mais recentes. Para qualquer mês ou ano,
            baixe seu export em <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noreferrer">
            Settings → Data → Export your data</a> e importe o .zip aqui.
          </p>
        )}
        <div className="diario-fonte-acoes">
          {demo ? (
            <button type="button" className="diario-link" onClick={sairDoExemplo}>Sair do exemplo</button>
          ) : (
            <>
              <button type="button" className="diario-link" onClick={() => inputArquivo.current?.click()}>
                {exportado ? 'Trocar arquivo' : 'Importar export (.zip)'}
              </button>
              {exportado && <button type="button" className="diario-link" onClick={remover}>Remover</button>}
            </>
          )}
        </div>
        <input ref={inputArquivo} type="file" accept=".zip,.csv" hidden onChange={importar} />
        {erroImport && <p className="diario-fonte-erro">{erroImport}</p>}
      </div>

      {!demo && (
        <div className="atalhos diario-atalhos">
          {USUARIO_EXEMPLO && (
            <button type="button" className="atalho" onClick={usarUsuarioExemplo} disabled={loading}>
              Testar com @{USUARIO_EXEMPLO}
            </button>
          )}
          <button type="button" className="atalho" onClick={verExemplo} disabled={loading}>
            Não tem Letterboxd? Ver com dados de exemplo
          </button>
        </div>
      )}

      {error && <div className="diario-error">{error}</div>}
      {resultado?.aviso && <div className="diario-aviso-box">{resultado.aviso}</div>}

      {resultado?.story.filmes.length > 0 && (
        <StoryDiario story={resultado.story} user={resultado.user} nomeArquivo={resultado.nomeArquivo} />
      )}

      {!loading && resultado?.story.filmes.length === 0 && (
        <div className="diario-empty">Nenhum filme registrado nesse período.</div>
      )}
    </div>
  );
}
