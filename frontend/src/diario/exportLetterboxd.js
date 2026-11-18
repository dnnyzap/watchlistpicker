import { unzipSync, strFromU8 } from 'fflate';

// Le o export de dados do Letterboxd (letterboxd.com/settings/data → "Export your data").
// Aceita o .zip inteiro ou so o diary.csv.

/** Parser de CSV com suporte a aspas, virgulas e quebras de linha dentro de campos. */
export function lerCsv(texto) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.some((v) => v !== '')) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((v) => v !== '')) linhas.push(linha);

  const [cabecalho = [], ...dados] = linhas;
  const nomes = cabecalho.map((h) => h.replace(/^﻿/, '').trim());
  return dados.map((valores) => Object.fromEntries(nomes.map((n, i) => [n, (valores[i] ?? '').trim()])));
}

const chaveFilme = (titulo, ano) => `${titulo.toLowerCase()}|${ano ?? ''}`;

export async function lerExport(arquivo) {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const ehZip = bytes[0] === 0x50 && bytes[1] === 0x4b;

  let diario;
  let perfil = null;
  let curtidos = null;
  if (ehZip) {
    const arquivos = unzipSync(bytes);
    const achar = (sufixo) => {
      const nome = Object.keys(arquivos).find((n) => n.toLowerCase().endsWith(sufixo));
      return nome ? strFromU8(arquivos[nome]) : null;
    };
    diario = achar('diary.csv');
    perfil = achar('profile.csv');
    curtidos = achar('likes/films.csv');
    if (!diario) throw new Error('Não achei o diary.csv dentro desse .zip. É o export do Letterboxd?');
  } else {
    diario = strFromU8(bytes);
  }

  const linhas = lerCsv(diario);
  if (!linhas.length || !('Watched Date' in linhas[0]) || !('Name' in linhas[0])) {
    throw new Error('Esse arquivo não parece ser o diary.csv do Letterboxd.');
  }

  const setCurtidos = new Set(
    curtidos ? lerCsv(curtidos).map((l) => chaveFilme(l.Name || '', Number(l.Year) || null)) : [],
  );

  const entradas = linhas
    .filter((l) => l.Name && /^\d{4}-\d{2}-\d{2}$/.test(l['Watched Date']))
    .map((l) => {
      const ano = Number(l.Year) || null;
      const nota = Number(l.Rating);
      return {
        titulo: l.Name,
        ano,
        url: l['Letterboxd URI'] || null,
        data: l['Watched Date'],
        nota: nota > 0 ? nota : null,
        revisto: l.Rewatch?.toLowerCase() === 'yes',
        curtido: setCurtidos.has(chaveFilme(l.Name, ano)),
        posterUrl: null,
        bannerUrl: null,
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  const usuario = perfil ? lerCsv(perfil)[0]?.Username || null : null;
  return { usuario, entradas, importadoEm: new Date().toISOString() };
}

const CHAVE = 'letterboxd-export';

export function carregarExportSalvo() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    return Array.isArray(salvo?.entradas) ? salvo : null;
  } catch {
    return null;
  }
}

export function salvarExport(dados) {
  try {
    if (dados) localStorage.setItem(CHAVE, JSON.stringify(dados));
    else localStorage.removeItem(CHAVE);
  } catch {
    // sem storage: o export vale so ate fechar a aba
  }
}
