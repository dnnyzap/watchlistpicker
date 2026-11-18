package org.watchlistproject.service;

import org.jsoup.Connection;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.watchlistproject.model.Detalhes;
import org.watchlistproject.model.Diario;
import org.watchlistproject.model.Filme;

import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class LetterboxdService {

    private static final Logger log = LoggerFactory.getLogger(LetterboxdService.class);

    private static final String BASE = "https://letterboxd.com";
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    private static final int TIMEOUT_MS = 15_000;
    /** O RSS do Letterboxd traz no maximo as ~50 atividades mais recentes. */
    private static final int LIMITE_RSS = 50;

    private static final Pattern USUARIO = Pattern.compile("[A-Za-z0-9_]{1,30}");
    private static final Pattern NOME_COM_ANO = Pattern.compile("^(.*) \\((\\d{4})\\)$");
    private static final Pattern SLUG_NO_LINK = Pattern.compile("/film/([^/]+)/");
    private static final Pattern LISTA = Pattern.compile(
            "^(?:https?://)?(?:www\\.)?(?:letterboxd\\.com/)?([A-Za-z0-9_]{1,30})/list/([A-Za-z0-9_:-]{1,150})(?:/.*)?$");
    private static final Pattern NUMERO = Pattern.compile("\\d+(?:\\.\\d+)?");
    private static final Pattern DURACAO = Pattern.compile("(\\d+)[\\s\\u00a0]*mins?"); // &nbsp; vira

    private final TmdbService tmdb;

    public LetterboxdService(TmdbService tmdb) {
        this.tmdb = tmdb;
    }

    // ============================================================
    // Sorteio de qualquer grade paginada de posteres: watchlist, filmes assistidos de um perfil
    // e listas publicas. Todas tem o mesmo HTML (LazyPoster + paginacao).
    // ============================================================
    public Filme sortearWatchlist(String user) {
        String u = validarUsuario(user);
        return sortearDaGrade("/" + u + "/watchlist/",
                "Usuário \"" + u + "\" não encontrado no Letterboxd.",
                "A watchlist de " + u + " está vazia ou é privada.");
    }

    public Filme sortearAssistidos(String user) {
        String u = validarUsuario(user);
        return sortearDaGrade("/" + u + "/films/",
                "Usuário \"" + u + "\" não encontrado no Letterboxd.",
                u + " ainda não marcou nenhum filme como assistido.");
    }

    /** Aceita o link de uma lista (letterboxd.com/usuario/list/nome/) ou so "usuario/list/nome". */
    public Filme sortearLista(String lista) {
        Matcher m = LISTA.matcher(lista == null ? "" : lista.trim());
        if (!m.matches()) {
            throw new IllegalArgumentException(
                    "Link de lista inválido. Use um link como letterboxd.com/usuario/list/nome-da-lista/.");
        }
        return sortearDaGrade("/" + m.group(1) + "/list/" + m.group(2) + "/",
                "Lista não encontrada no Letterboxd.", "Essa lista está vazia.");
    }

    private Filme sortearDaGrade(String caminho, String naoEncontrado, String vazio) {
        String base = BASE + caminho;
        Document primeira = baixarHtml(base, naoEncontrado);
        Elements posters = postersDa(primeira);
        if (posters.isEmpty()) {
            throw new LetterboxdException(HttpStatus.NOT_FOUND, vazio);
        }

        int pagina = ThreadLocalRandom.current().nextInt(ultimaPagina(primeira)) + 1;
        if (pagina > 1) {
            try {
                Elements daPagina = postersDa(baixarHtml(base + "page/" + pagina + "/", naoEncontrado));
                if (!daPagina.isEmpty()) {
                    posters = daPagina;
                }
            } catch (LetterboxdException e) {
                // A Cloudflare do Letterboxd bloqueia algumas paginas (ex.: /usuario/films/page/2/).
                // Sorteia da primeira pagina em vez de falhar.
                log.info("Pagina {} de {} indisponivel, usando a primeira", pagina, caminho);
            }
        }

        Element escolhido = posters.get(ThreadLocalRandom.current().nextInt(posters.size()));
        return filmeDoPoster(escolhido);
    }

    private Elements postersDa(Document doc) {
        Elements posters = doc.select("[data-component-class=LazyPoster][data-item-slug]");
        if (posters.isEmpty()) {
            posters = doc.select("[data-film-slug]"); // layout antigo do Letterboxd
        }
        return posters;
    }

    private int ultimaPagina(Document doc) {
        int max = 1;
        for (Element a : doc.select(".paginate-pages .paginate-page a, .paginate-pages a.paginate-page")) {
            String txt = a.text().replace(",", "").replace(".", "").trim();
            if (txt.matches("\\d+")) {
                max = Math.max(max, Integer.parseInt(txt));
            }
        }
        return max;
    }

    private Filme filmeDoPoster(Element el) {
        String slug = primeiroNaoVazio(el.attr("data-item-slug"), el.attr("data-film-slug"));
        String link = primeiroNaoVazio(el.attr("data-item-link"), el.attr("data-film-link"),
                slug.isEmpty() ? "" : "/film/" + slug + "/");
        String nome = primeiroNaoVazio(el.attr("data-item-name"), el.attr("data-film-name"),
                el.select("img").attr("alt"));

        String titulo = nome;
        Integer ano = null;
        Matcher m = NOME_COM_ANO.matcher(nome);
        if (m.matches()) {
            titulo = m.group(1);
            ano = Integer.parseInt(m.group(2));
        }
        if (titulo.isBlank()) {
            throw new LetterboxdException(HttpStatus.BAD_GATEWAY,
                    "Não consegui ler o filme sorteado. O Letterboxd pode ter mudado o layout da página.");
        }

        String url = link.startsWith("http") ? link : BASE + link;
        return comDetalhes(titulo, ano, url, slug.isEmpty() ? slugDoLink(url) : slug, null, null);
    }

    // ============================================================
    // Pagina do filme: sinopse, diretor, nota media, duracao, generos, pais e o id do TMDB.
    // Se ela falhar, o sorteio continua so com titulo, ano e imagens.
    // ============================================================
    private Filme comDetalhes(String titulo, Integer ano, String url, String slug, String tmdbId,
                              String posterReserva) {
        PaginaFilme pagina = slug.isEmpty() ? PaginaFilme.VAZIA : lerPaginaFilme(slug);

        String id = tmdbId != null ? tmdbId : pagina.tmdbId();
        TmdbService.Imagens img = tmdb.buscarPorId(id);
        if (img.vazio()) img = tmdb.buscarPorTitulo(titulo, ano);
        String poster = img.posterUrl() != null ? img.posterUrl() : posterReserva;
        String banner = img.bannerUrl() != null ? img.bannerUrl()
                : pagina.banner() != null ? pagina.banner() : poster;

        return new Filme(titulo, ano, url, poster, banner, null, null, false, false, pagina.detalhes());
    }

    private PaginaFilme lerPaginaFilme(String slug) {
        Document doc;
        try {
            doc = conectar(BASE + "/film/" + slug + "/").header("Accept", "text/html").get();
        } catch (IOException e) {
            log.warn("Não consegui ler a página do filme {}: {}", slug, e.toString());
            return PaginaFilme.VAZIA;
        }

        Element comId = doc.selectFirst("[data-tmdb-id]");
        String tmdbId = comId == null ? null : vazioParaNulo(comId.attr("data-tmdb-id"));

        String diretor = null;
        Double notaMedia = null;
        for (int i = 1; i <= 2; i++) {
            String rotulo = meta(doc, "twitter:label" + i);
            String valor = meta(doc, "twitter:data" + i);
            if (rotulo == null || valor == null) continue;
            if (rotulo.startsWith("Directed")) {
                diretor = valor;
            } else if (rotulo.startsWith("Average")) {
                Matcher n = NUMERO.matcher(valor);
                if (n.find()) notaMedia = Double.valueOf(n.group());
            }
        }

        Integer duracao = null;
        Element rodape = doc.selectFirst("p.text-footer, p.text-footnote");
        if (rodape != null) {
            Matcher d = DURACAO.matcher(rodape.text());
            if (d.find()) duracao = Integer.valueOf(d.group(1));
        }

        List<String> generos = doc.select("#tab-genres a[href^=/films/genre/]").eachText();
        if (generos.isEmpty()) generos = doc.select("a[href^=/films/genre/]").eachText();
        Element pais = doc.selectFirst("a[href^=/films/country/]");

        Element tagline = doc.selectFirst(".tagline");
        Element sinopse = doc.selectFirst(".review .truncate p, section.production-synopsis p");
        String textoSinopse = sinopse != null ? sinopse.text() : meta(doc, "og:description");

        Detalhes detalhes = new Detalhes(vazioParaNulo(textoSinopse),
                tagline == null ? null : vazioParaNulo(tagline.text()), diretor, duracao, notaMedia,
                generos.stream().distinct().limit(3).toList(),
                pais == null ? null : vazioParaNulo(pais.text()));
        return new PaginaFilme(tmdbId, vazioParaNulo(meta(doc, "twitter:image")), detalhes);
    }

    private static String meta(Document doc, String nome) {
        Element el = doc.selectFirst("meta[name=" + nome + "], meta[property=" + nome + "]");
        return el == null ? null : vazioParaNulo(el.attr("content"));
    }

    private static String vazioParaNulo(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private record PaginaFilme(String tmdbId, String banner, Detalhes detalhes) {
        static final PaginaFilme VAZIA = new PaginaFilme(null, null, null);
    }

    // ============================================================
    // Sorteio dos assistidos recentemente (RSS)
    // ============================================================
    public Filme sortearRecente(String user) {
        String u = validarUsuario(user);
        List<EntradaRss> recentes = buscarRss(u).entradas();
        if (recentes.isEmpty()) {
            throw new LetterboxdException(HttpStatus.NOT_FOUND,
                    u + " não registrou nenhum filme recentemente.");
        }
        EntradaRss e = recentes.get(ThreadLocalRandom.current().nextInt(recentes.size()));
        return comDetalhes(e.titulo(), e.ano(), e.url(), slugDoLink(e.url()), e.tmdbId(), e.posterLetterboxd());
    }

    // ============================================================
    // Diario de um mes ou de um ano inteiro (mes == null), via RSS.
    // Se o mes for mais antigo que o RSS, tenta a pagina do diario.
    // ============================================================
    public Diario buscarDiario(String user, int ano, Integer mes) {
        String u = validarUsuario(user);
        if ((mes != null && (mes < 1 || mes > 12)) || ano < 1900 || ano > 2100) {
            throw new IllegalArgumentException("Mês ou ano inválido.");
        }
        LocalDate inicio = mes == null ? LocalDate.of(ano, 1, 1) : LocalDate.of(ano, mes, 1);
        LocalDate fim = mes == null ? inicio.plusYears(1) : inicio.plusMonths(1);
        if (inicio.isAfter(LocalDate.now())) {
            return new Diario(List.of(), false, null);
        }

        Feed feed = buscarRss(u);
        List<EntradaRss> doPeriodo = feed.entradas().stream()
                .filter(e -> e.assistido() != null && !e.assistido().isBefore(inicio) && e.assistido().isBefore(fim))
                .toList();

        // O feed so tem os ~50 registros mais recentes. Se o mais antigo deles ja e de dentro (ou depois) do
        // periodo, o comeco do periodo ficou de fora.
        LocalDate maisAntigo = feed.entradas().stream().map(EntradaRss::assistido)
                .filter(Objects::nonNull).min(LocalDate::compareTo).orElse(null);
        boolean incompleto = feed.totalItens() >= LIMITE_RSS && (maisAntigo == null || !maisAntigo.isBefore(inicio));

        if (doPeriodo.isEmpty() && incompleto && mes != null) {
            return new Diario(paraFilmes(diarioPorScraping(u, YearMonth.of(ano, mes))), false, null);
        }
        return new Diario(paraFilmes(doPeriodo), incompleto,
                incompleto && maisAntigo != null ? maisAntigo.toString() : null);
    }

    private List<EntradaRss> diarioPorScraping(String u, YearMonth alvo) {
        String url = String.format("%s/%s/diary/for/%d/%02d/", BASE, u, alvo.getYear(), alvo.getMonthValue());
        Document doc;
        try {
            doc = baixarHtml(url, usuarioNaoEncontrado(u));
        } catch (LetterboxdException e) {
            if (e.getStatus() == HttpStatus.NOT_FOUND) throw e;
            throw new LetterboxdException(HttpStatus.BAD_GATEWAY,
                    "Esse mês é mais antigo que os ~50 registros mais recentes que o Letterboxd libera. "
                            + "Importe o export de dados do Letterboxd para ver qualquer mês.", e);
        }

        List<EntradaRss> entradas = new ArrayList<>();
        for (Element row : doc.select("tr.diary-entry-row")) {
            Element poster = row.selectFirst("[data-item-slug], [data-film-slug]");
            Element link = row.selectFirst(".td-film-details h3 a, h2.name a, td.col-production a");
            String slug = poster != null
                    ? primeiroNaoVazio(poster.attr("data-item-slug"), poster.attr("data-film-slug"))
                    : slugDoLink(link == null ? "" : link.attr("href"));
            String titulo = poster != null
                    ? primeiroNaoVazio(poster.attr("data-item-name"), poster.attr("data-film-name"))
                    : (link == null ? "" : link.text());
            Matcher m = NOME_COM_ANO.matcher(titulo);
            Integer ano = null;
            if (m.matches()) {
                titulo = m.group(1);
                ano = Integer.parseInt(m.group(2));
            }
            if (!titulo.isBlank() && !slug.isEmpty()) {
                entradas.add(new EntradaRss(titulo, ano, BASE + "/film/" + slug + "/", null, null, alvo.atDay(1),
                        null, false, false));
            }
        }
        return entradas;
    }

    // ============================================================
    // RSS publico: https://letterboxd.com/{user}/rss/
    // ============================================================
    private Feed buscarRss(String u) {
        Document xml;
        try {
            xml = conectar(BASE + "/" + u + "/rss/").parser(Parser.xmlParser()).get();
        } catch (IOException e) {
            throw erroDeRede(e, usuarioNaoEncontrado(u));
        }

        Elements itens = xml.select("item");
        List<EntradaRss> entradas = new ArrayList<>();
        for (Element item : itens) {
            String titulo = texto(item, "letterboxd|filmTitle");
            if (titulo.isEmpty()) {
                continue; // listas e outras atividades que nao sao filmes
            }
            String anoTxt = texto(item, "letterboxd|filmYear");
            String slug = slugDoLink(texto(item, "link"));
            String url = slug.isEmpty() ? texto(item, "link") : BASE + "/film/" + slug + "/";

            String posterLetterboxd = null;
            Element desc = item.selectFirst("description");
            if (desc != null) {
                Element img = Jsoup.parse(desc.text()).selectFirst("img[src]");
                if (img != null) posterLetterboxd = img.attr("src");
            }

            LocalDate assistido = null;
            try {
                String data = texto(item, "letterboxd|watchedDate");
                if (!data.isEmpty()) assistido = LocalDate.parse(data);
            } catch (DateTimeParseException ignored) {
                // sem data: entra no sorteio, mas nao no diario
            }

            Double nota = null;
            try {
                String n = texto(item, "letterboxd|memberRating");
                if (!n.isEmpty()) nota = Double.valueOf(n);
            } catch (NumberFormatException ignored) {
                // sem nota
            }

            entradas.add(new EntradaRss(titulo, anoTxt.matches("\\d{4}") ? Integer.valueOf(anoTxt) : null,
                    url, texto(item, "tmdb|movieId"), posterLetterboxd, assistido, nota,
                    "Yes".equalsIgnoreCase(texto(item, "letterboxd|rewatch")),
                    "Yes".equalsIgnoreCase(texto(item, "letterboxd|memberLike"))));
        }
        return new Feed(entradas, itens.size());
    }

    private List<Filme> paraFilmes(List<EntradaRss> entradas) {
        // Busca as imagens no TMDB em paralelo (virtual threads) para o diario nao demorar.
        try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<Filme>> futuros = entradas.stream().map(e -> exec.submit(() -> paraFilme(e))).toList();
            List<Filme> filmes = new ArrayList<>(futuros.size());
            for (Future<Filme> f : futuros) {
                filmes.add(f.get());
            }
            return filmes;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        } catch (ExecutionException e) {
            throw new IllegalStateException(e.getCause());
        }
    }

    private Filme paraFilme(EntradaRss e) {
        TmdbService.Imagens img = tmdb.buscarPorId(e.tmdbId());
        if (img.vazio()) img = tmdb.buscarPorTitulo(e.titulo(), e.ano());
        String poster = img.posterUrl() != null ? img.posterUrl() : e.posterLetterboxd();
        String banner = img.bannerUrl() != null ? img.bannerUrl() : poster;
        return new Filme(e.titulo(), e.ano(), e.url(), poster, banner,
                e.assistido() == null ? null : e.assistido().toString(), e.nota(), e.revisto(), e.curtido());
    }

    // ============================================================
    // Utilitarios
    // ============================================================
    private String validarUsuario(String user) {
        String u = user == null ? "" : user.trim();
        if (!USUARIO.matcher(u).matches()) {
            throw new IllegalArgumentException("Usuário inválido. Use só letras, números e _.");
        }
        return u;
    }

    private Connection conectar(String url) {
        return Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .header("Accept-Language", "en-US,en;q=0.9")
                .timeout(TIMEOUT_MS);
    }

    /** {@code naoEncontrado}: mensagem para quando o Letterboxd responde 404. */
    private Document baixarHtml(String url, String naoEncontrado) {
        try {
            return conectar(url).header("Accept", "text/html").get();
        } catch (IOException e) {
            throw erroDeRede(e, naoEncontrado);
        }
    }

    private static String usuarioNaoEncontrado(String u) {
        return "Usuário \"" + u + "\" não encontrado no Letterboxd.";
    }

    private LetterboxdException erroDeRede(IOException e, String naoEncontrado) {
        if (e instanceof HttpStatusException h) {
            if (h.getStatusCode() == 404) {
                return new LetterboxdException(HttpStatus.NOT_FOUND, naoEncontrado, e);
            }
            log.warn("Letterboxd respondeu HTTP {} para {}", h.getStatusCode(), h.getUrl());
            return new LetterboxdException(HttpStatus.BAD_GATEWAY,
                    "O Letterboxd recusou a requisição (HTTP " + h.getStatusCode() + "). Tente de novo em instantes.", e);
        }
        log.warn("Erro de rede falando com o Letterboxd: {}", e.toString());
        return new LetterboxdException(HttpStatus.BAD_GATEWAY, "Não foi possível acessar o Letterboxd agora.", e);
    }

    private static String texto(Element pai, String seletor) {
        Element el = pai.selectFirst(seletor);
        return el == null ? "" : el.text().trim();
    }

    private static String slugDoLink(String link) {
        Matcher m = SLUG_NO_LINK.matcher(link == null ? "" : link);
        return m.find() ? m.group(1) : "";
    }

    private static String primeiroNaoVazio(String... valores) {
        for (String v : valores) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private record Feed(List<EntradaRss> entradas, int totalItens) { }

    private record EntradaRss(String titulo, Integer ano, String url, String tmdbId,
                              String posterLetterboxd, LocalDate assistido, Double nota,
                              boolean revisto, boolean curtido) { }
}
