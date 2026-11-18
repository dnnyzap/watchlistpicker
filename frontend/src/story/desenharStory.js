import { API } from '../hooks/useFetch';

// Story do Instagram: 1080x1920. O topo (~250px) e a base (~250px) ficam cobertos pela
// interface do app (barra de perfil, campo de resposta), entao o conteudo fica entre eles.
export const LARGURA = 1080;
export const ALTURA = 1920;

const MARGEM = 80;
const GRADE_TOPO = 560;
const GRADE_BASE = 1650;
const ESPACO = 18;
const POSTER_MAX = 440;
const FONTE = "'Inter', system-ui, sans-serif";
/** Altura da faixa de notas/icones embaixo de cada poster, em proporcao da largura do poster. */
const FAIXA = 0.22;

const COR_ESTRELA = '#f5c451';
const COR_CORACAO = '#ff6b81';

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const OPCOES_PADRAO = { notas: true, marcas: true, fundo: 'banner', cor: '#1f2a44' };

/** Escolhe o numero de colunas que deixa os posteres o maior possivel dentro da area. */
export function calcularGrade(n, largura, altura, proporcao = 1.5, espaco = ESPACO) {
  let melhor = { colunas: 1, linhas: n, w: 0 };
  for (let colunas = 1; colunas <= Math.min(n, 12); colunas++) {
    const linhas = Math.ceil(n / colunas);
    const porLargura = (largura - espaco * (colunas - 1)) / colunas;
    const porAltura = (altura - espaco * (linhas - 1)) / linhas / proporcao;
    const w = Math.min(porLargura, porAltura, POSTER_MAX);
    if (w > melhor.w + 0.5) melhor = { colunas, linhas, w };
  }
  return { ...melhor, h: melhor.w * proporcao };
}

// ---------- imagens (com cache, para redesenhar sem baixar de novo) ----------

const cacheImagens = new Map();

function carregarImagem(url) {
  if (!url) return Promise.resolve(null);
  if (!cacheImagens.has(url)) {
    cacheImagens.set(url, new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => { cacheImagens.delete(url); resolve(null); };
      img.src = `${API}/imagem?url=${encodeURIComponent(url)}`;
    }));
  }
  return cacheImagens.get(url);
}

function desenharCobrindo(ctx, img, x, y, w, h) {
  const escala = Math.max(w / img.width, h / img.height);
  const sw = w / escala;
  const sh = h / escala;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

// ---------- formas ----------

function retanguloArredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function caminhoEstrela(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const raio = i % 2 === 0 ? r : r * 0.45;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + raio * Math.cos(ang), cy + raio * Math.sin(ang));
  }
  ctx.closePath();
}

function estrela(ctx, cx, cy, r, metade, cor) {
  ctx.save();
  if (metade) {
    ctx.beginPath();
    ctx.rect(cx - r, cy - r, r, r * 2);
    ctx.clip();
  }
  caminhoEstrela(ctx, cx, cy, r);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.restore();
}

function coracao(ctx, cx, cy, s) {
  const y = cy - s * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx, y + s * 0.28);
  ctx.bezierCurveTo(cx, y, cx - s * 0.5, y, cx - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(cx - s * 0.5, y + s * 0.58, cx - s * 0.12, y + s * 0.72, cx, y + s * 0.88);
  ctx.bezierCurveTo(cx + s * 0.12, y + s * 0.72, cx + s * 0.5, y + s * 0.58, cx + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(cx + s * 0.5, y, cx, y, cx, y + s * 0.28);
  ctx.fillStyle = COR_CORACAO;
  ctx.fill();
}

function revisto(ctx, cx, cy, s, cor) {
  const r = s * 0.36;
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineWidth = Math.max(1.5, s * 0.13);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI * 0.35, Math.PI * 1.45);
  ctx.stroke();
  // ponta da seta no fim do arco
  const ang = -Math.PI * 0.35;
  const px = cx + r * Math.cos(ang);
  const py = cy + r * Math.sin(ang);
  const t = s * 0.22;
  ctx.beginPath();
  ctx.moveTo(px + t, py - t * 0.2);
  ctx.lineTo(px - t * 0.35, py - t * 0.9);
  ctx.lineTo(px - t * 0.1, py + t * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------- texto ----------

function quebrarTexto(ctx, texto, larguraMax) {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/)) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > larguraMax && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function texto(ctx, conteudo, x, y, { tamanho, peso = 400, cor, alinhamento = 'left', espacamento = 0, larguraMax }) {
  let t = tamanho;
  const aplicar = () => {
    ctx.font = `${peso} ${t}px ${FONTE}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${espacamento}px`;
  };
  aplicar();
  // Diminui a fonte ate caber, se houver limite de largura
  while (larguraMax && t > 12 && ctx.measureText(conteudo).width > larguraMax) {
    t -= 2;
    aplicar();
  }
  ctx.fillStyle = cor;
  ctx.textAlign = alinhamento;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(conteudo, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

// ---------- fundo e cores ----------

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function paleta(opcoes) {
  const claro = opcoes.fundo === 'cor' && luminancia(opcoes.cor) > 0.4;
  const base = claro ? '17,17,20' : '255,255,255';
  return {
    claro,
    estrela: claro ? '#b87d00' : COR_ESTRELA,
    forte: `rgba(${base},0.95)`,
    medio: `rgba(${base},0.62)`,
    fraco: `rgba(${base},0.5)`,
    borda: `rgba(${base},0.1)`,
    vazio: claro ? 'rgba(0,0,0,0.08)' : '#1b1b20',
  };
}

function desenharFundo(ctx, banner, opcoes) {
  if (opcoes.fundo === 'cor') {
    ctx.fillStyle = opcoes.cor;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    const brilho = ctx.createRadialGradient(LARGURA * 0.2, 0, 0, LARGURA * 0.2, 0, ALTURA);
    brilho.addColorStop(0, 'rgba(255,255,255,0.10)');
    brilho.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    return;
  }

  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  if (opcoes.fundo === 'banner' && banner) {
    const temFiltro = 'filter' in ctx;
    ctx.save();
    if (temFiltro) ctx.filter = 'blur(50px) saturate(1.2)';
    desenharCobrindo(ctx, banner, -100, -100, LARGURA + 200, ALTURA + 200);
    ctx.restore();
    ctx.fillStyle = temFiltro ? 'rgba(11,11,13,0.72)' : 'rgba(11,11,13,0.86)';
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }
  const degrade = ctx.createLinearGradient(0, 0, 0, ALTURA);
  degrade.addColorStop(0, 'rgba(11,11,13,0.55)');
  degrade.addColorStop(0.35, 'rgba(11,11,13,0)');
  degrade.addColorStop(0.8, 'rgba(11,11,13,0)');
  degrade.addColorStop(1, 'rgba(11,11,13,0.6)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
}

// ---------- poster ----------

function desenharPoster(ctx, img, titulo, x, y, w, h, cores) {
  const raio = Math.max(6, w * 0.035);
  ctx.save();
  ctx.shadowColor = cores.claro ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = cores.vazio;
  retanguloArredondado(ctx, x, y, w, h, raio);
  ctx.fill();
  ctx.restore();

  ctx.save();
  retanguloArredondado(ctx, x, y, w, h, raio);
  ctx.clip();
  if (img) {
    desenharCobrindo(ctx, img, x, y, w, h);
  } else {
    const tamanho = Math.max(12, w * 0.1);
    ctx.font = `600 ${tamanho}px ${FONTE}`;
    const linhas = quebrarTexto(ctx, titulo, w * 0.8).slice(0, 4);
    const inicio = y + h / 2 - ((linhas.length - 1) * tamanho * 1.25) / 2;
    linhas.forEach((linha, i) =>
      texto(ctx, linha, x + w / 2, inicio + i * tamanho * 1.25 + tamanho * 0.35,
        { tamanho, peso: 600, cor: cores.medio, alinhamento: 'center' }));
  }
  ctx.restore();

  ctx.strokeStyle = cores.borda;
  ctx.lineWidth = 2;
  retanguloArredondado(ctx, x + 1, y + 1, w - 2, h - 2, raio);
  ctx.stroke();
}

/** Estrelas da nota + coracao (curtido) + seta circular (revisto), centralizados embaixo do poster. */
function desenharFaixa(ctx, filme, x, y, w, opcoes, cores) {
  const s = Math.min(w / 7.5, 30); // tamanho de cada icone
  const passo = s * 1.08;
  const itens = [];
  if (opcoes.notas && filme.nota) {
    const cheias = Math.floor(filme.nota);
    for (let i = 0; i < cheias; i++) itens.push('estrela');
    if (filme.nota - cheias >= 0.5) itens.push('meia');
  }
  if (opcoes.marcas && filme.curtido) itens.push('coracao');
  if (opcoes.marcas && filme.revisto) itens.push('revisto');
  if (!itens.length) return;

  // separa os icones das estrelas com um respiro
  const temEstrelas = itens[0] === 'estrela' || itens[0] === 'meia';
  const primeiroIcone = itens.findIndex((t) => t === 'coracao' || t === 'revisto');
  const respiro = temEstrelas && primeiroIcone > 0 ? s * 0.35 : 0;
  // a meia estrela ocupa so metade
  const larguras = itens.map((t) => (t === 'meia' ? passo * 0.55 : passo));
  const total = larguras.reduce((a, b) => a + b, 0) + respiro;

  let cx = x + (w - total) / 2;
  const cy = y + w * FAIXA * 0.5;
  itens.forEach((t, i) => {
    if (i === primeiroIcone) cx += respiro;
    const centro = t === 'meia' ? cx + passo / 2 : cx + larguras[i] / 2;
    if (t === 'estrela') estrela(ctx, centro, cy, s * 0.5, false, cores.estrela);
    if (t === 'meia') estrela(ctx, centro, cy, s * 0.5, true, cores.estrela);
    if (t === 'coracao') coracao(ctx, centro, cy, s * 0.9);
    if (t === 'revisto') revisto(ctx, centro, cy, s * 0.9, cores.medio);
    cx += larguras[i];
  });
}

// ---------- story ----------

/**
 * Desenha o story completo no canvas.
 * @param story  { filmes, cabecalho: { sobretitulo, titulo, subtitulo }, rodape }
 */
export async function desenharStory(canvas, { story, user, opcoes = OPCOES_PADRAO }) {
  const { filmes, cabecalho, rodape } = story;
  await Promise.all([300, 400, 600, 700].map((p) => document.fonts?.load(`${p} 40px Inter`).catch(() => {})));

  const [posteres, banner] = await Promise.all([
    Promise.all(filmes.map((f) => carregarImagem(f.posterUrl))),
    opcoes.fundo === 'banner' ? carregarImagem(filmes.find((f) => f.bannerUrl)?.bannerUrl) : null,
  ]);

  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext('2d');
  const cores = paleta(opcoes);
  const largura = LARGURA - MARGEM * 2;

  desenharFundo(ctx, banner, opcoes);

  // Cabecalho
  texto(ctx, cabecalho.sobretitulo, MARGEM, 300, { tamanho: 30, peso: 600, cor: cores.fraco, espacamento: 8 });
  texto(ctx, cabecalho.titulo, MARGEM - 6, 430, { tamanho: 132, peso: 700, cor: cores.forte, espacamento: -4, larguraMax: largura });
  texto(ctx, cabecalho.subtitulo, MARGEM, 500, { tamanho: 52, peso: 300, cor: cores.medio, larguraMax: largura });

  // Grade
  const comFaixa = opcoes.notas || opcoes.marcas;
  const proporcao = 1.5 + (comFaixa ? FAIXA : 0);
  const areaA = GRADE_BASE - GRADE_TOPO;
  const { colunas, linhas, w, h } = calcularGrade(filmes.length, largura, areaA, proporcao);
  const alturaGrade = linhas * h + (linhas - 1) * ESPACO;
  const topo = GRADE_TOPO + (areaA - alturaGrade) / 2;

  filmes.forEach((filme, i) => {
    const linha = Math.floor(i / colunas);
    const naLinha = Math.min(colunas, filmes.length - linha * colunas);
    const larguraLinha = naLinha * w + (naLinha - 1) * ESPACO;
    const x = MARGEM + (largura - larguraLinha) / 2 + (i % colunas) * (w + ESPACO);
    const y = topo + linha * (h + ESPACO);
    desenharPoster(ctx, posteres[i], filme.titulo, x, y, w, w * 1.5, cores);
    if (comFaixa) desenharFaixa(ctx, filme, x, y + w * 1.5, w, opcoes, cores);
  });

  // Rodape
  texto(ctx, `@${user}`, MARGEM, 1740, { tamanho: 34, peso: 600, cor: cores.forte });
  if (rodape) {
    texto(ctx, rodape, LARGURA - MARGEM, 1740, { tamanho: 34, peso: 400, cor: cores.fraco, alinhamento: 'right', larguraMax: largura * 0.6 });
  }
}
