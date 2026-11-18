import { MESES } from '../story/desenharStory';

/** Acima disso, o story do ano mostra so os mais bem avaliados (senao os posteres ficam minusculos). */
export const LIMITE_ANO = 40;

const formatarNota = (n) => n.toFixed(1).replace('.', ',');

function estatisticas(filmes) {
  const notas = filmes.map((f) => f.nota).filter((n) => n != null);
  return {
    total: filmes.length,
    revistos: filmes.filter((f) => f.revisto).length,
    media: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
  };
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/**
 * Recebe os filmes do periodo em ordem cronologica e devolve o que vai pro story:
 * quais posteres, e os textos do cabecalho e do rodape.
 */
export function montarStory({ filmes, periodo, ano, mes }) {
  const st = estatisticas(filmes);
  const totalTxt = plural(st.total, 'filme', 'filmes');

  if (periodo === 'mes') {
    return {
      filmes,
      cabecalho: { sobretitulo: 'DIÁRIO DE FILMES', titulo: MESES[mes - 1], subtitulo: String(ano) },
      rodape: totalTxt,
    };
  }

  const partes = [totalTxt];
  if (st.revistos) partes.push(plural(st.revistos, 'revisto', 'revistos'));
  if (st.media != null) partes.push(`nota média ${formatarNota(st.media)}`);

  let escolhidos = filmes;
  let rodape = ''; // o total ja aparece no cabecalho
  if (filmes.length > LIMITE_ANO) {
    // Um poster por filme (revisoes contam uma vez), melhores notas primeiro.
    const porFilme = new Map();
    for (const f of filmes) {
      const chave = `${f.titulo}|${f.ano}`;
      const atual = porFilme.get(chave);
      if (!atual || (f.nota ?? -1) > (atual.nota ?? -1) || (f.curtido && !atual.curtido)) {
        porFilme.set(chave, { ...f, curtido: f.curtido || atual?.curtido || false });
      }
    }
    escolhidos = [...porFilme.values()]
      .sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || Number(b.curtido) - Number(a.curtido)
        || a.data.localeCompare(b.data))
      .slice(0, LIMITE_ANO);
    rodape = `os ${LIMITE_ANO} mais bem avaliados`;
  }

  return {
    filmes: escolhidos,
    cabecalho: { sobretitulo: 'RETROSPECTIVA', titulo: String(ano), subtitulo: partes.join(' · ') },
    rodape,
  };
}
