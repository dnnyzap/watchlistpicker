// Diario de exemplo, para quem nao tem conta no Letterboxd (ou se o Letterboxd bloquear o servidor).
// O sorteio nao usa mais isto: sem conta, ele sorteia de listas publicas reais do Letterboxd.
// Os filmes sao reais; notas, datas e marcas sao ficticias. Os posteres vem do TMDB pelo backend.

/** Usuario real para o botao "Testar com @...". Defina VITE_USUARIO_EXEMPLO no deploy. */
export const USUARIO_EXEMPLO = (import.meta.env.VITE_USUARIO_EXEMPLO || '').trim();

export const USUARIO_DEMO = 'exemplo';

// [titulo, ano, nota, revisto, curtido], do mais recente para o mais antigo
const DIARIO = [
  ['One Battle After Another', 2025, 4.5, false, true],
  ['Weapons', 2025, 4, false, false],
  ['Sinners', 2025, 4.5, false, true],
  ['Parasite', 2019, 5, true, true],
  ['Flow', 2024, 4.5, false, true],
  ['The Brutalist', 2024, 4, false, false],
  ["I'm Still Here", 2024, 4.5, false, true],
  ['Conclave', 2024, 4, false, false],
  ['The Substance', 2024, 3.5, false, false],
  ['Anora', 2024, 4.5, false, true],
  ['City of God', 2002, 5, true, true],
  ['Furiosa: A Mad Max Saga', 2024, 4, false, false],
  ['Challengers', 2024, 4, false, false],
  ['Dune: Part Two', 2024, 4.5, false, true],
  ['In the Mood for Love', 2000, 5, false, true],
  ['Poor Things', 2023, 3.5, false, false],
  ['The Zone of Interest', 2023, 4, false, false],
  ['Perfect Days', 2023, 4.5, false, true],
  ['Anatomy of a Fall', 2023, 4, false, false],
  ['Past Lives', 2023, 4.5, false, true],
  ['Spirited Away', 2001, 4.5, true, false],
  ['The Holdovers', 2023, 4, false, true],
  ['Fallen Leaves', 2023, 4, false, false],
  ['Inside Out 2', 2024, 3.5, false, false],
  ['Mad Max: Fury Road', 2015, 5, true, true],
  ['Spider-Man: Across the Spider-Verse', 2023, 4.5, false, true],
  ['Oppenheimer', 2023, 4, false, false],
  ['Barbie', 2023, 3.5, false, false],
  ['Aftersun', 2022, 4.5, false, true],
  ['Decision to Leave', 2022, 4.5, false, false],
  ['The Banshees of Inisherin', 2022, 4, false, false],
  ['Everything Everywhere All at Once', 2022, 4, false, false],
  ['Portrait of a Lady on Fire', 2019, 5, false, true],
  ['Bacurau', 2019, 4, false, false],
  ['Knives Out', 2019, 3.5, false, false],
  ['Central Station', 1998, 4.5, false, false],
  ['The Grand Budapest Hotel', 2014, 4, true, false],
  ['Whiplash', 2014, 4.5, false, false],
  ['Nightcrawler', 2014, 4, false, false],
  ['Arrival', 2016, 4.5, false, false],
  ['La La Land', 2016, 4, true, false],
  ['Moonlight', 2016, 4.5, false, false],
  ['Aquarius', 2016, 4, false, false],
  ['The Second Mother', 2015, 4, false, false],
  ['Get Out', 2017, 4, false, false],
  ['Lady Bird', 2017, 4, false, false],
  ['Eternal Sunshine of the Spotless Mind', 2004, 4.5, true, true],
  ['Before Sunrise', 1995, 4.5, false, true],
  ['Before Sunset', 2004, 4.5, false, false],
  ['Her', 2013, 4, false, false],
  ['Chungking Express', 1994, 4.5, false, true],
  ['Paris, Texas', 1984, 4.5, false, false],
  ['Amélie', 2001, 4, true, false],
  ['Pulp Fiction', 1994, 4.5, true, false],
  ['The Godfather', 1972, 5, false, false],
  ['2001: A Space Odyssey', 1968, 4.5, false, false],
  ['Zodiac', 2007, 4.5, false, false],
  ['Prisoners', 2013, 4, false, false],
  ['The Social Network', 2010, 4, true, false],
  ['Drive', 2011, 3.5, true, false],
];

const urlBusca = (titulo) => `https://letterboxd.com/search/films/${encodeURIComponent(titulo)}/`;

function dataLocal(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  const dd = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
}

/**
 * Diario no mesmo formato do export do Letterboxd, em ordem cronologica. As datas sao relativas a hoje
 * (a cada 2 dias no ultimo mes e meio, depois a cada 4), para o mes atual e o anterior sempre terem filmes.
 */
export function diarioDemo() {
  return DIARIO.map(([titulo, ano, nota, revisto, curtido], i) => ({
    titulo, ano, nota, revisto, curtido,
    url: urlBusca(titulo),
    data: dataLocal(i < 20 ? 1 + i * 2 : 41 + (i - 20) * 4),
    posterUrl: null,
    bannerUrl: null,
  })).reverse();
}
