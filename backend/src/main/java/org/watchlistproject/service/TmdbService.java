package org.watchlistproject.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Busca poster e banner de filmes na API do TMDB. Nunca lanca excecao: sem imagem, devolve vazio. */
@Service
public class TmdbService {

    private static final Logger log = LoggerFactory.getLogger(TmdbService.class);
    private static final String POSTER = "https://image.tmdb.org/t/p/w500";
    private static final String BANNER = "https://image.tmdb.org/t/p/w1280";

    private final RestClient client;
    private final String apiKey;
    private final boolean usaToken;
    private final Map<String, Imagens> cache = new ConcurrentHashMap<>();

    public TmdbService(@Value("${tmdb.api.key:}") String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        // Chave v3 tem 32 caracteres; o "API Read Access Token" (v4) e um JWT longo, enviado como Bearer.
        this.usaToken = this.apiKey.length() > 40;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));

        RestClient.Builder b = RestClient.builder()
                .baseUrl("https://api.themoviedb.org/3")
                .requestFactory(factory);
        if (usaToken) {
            b.defaultHeader("Authorization", "Bearer " + this.apiKey);
        }
        this.client = b.build();

        if (this.apiKey.isEmpty()) {
            log.warn("TMDB_API_KEY nao configurada: os filmes vao aparecer sem poster do TMDB.");
        }
    }

    public boolean configurado() {
        return !apiKey.isEmpty();
    }

    public Imagens buscarPorId(String tmdbId) {
        if (!configurado() || tmdbId == null || !tmdbId.matches("\\d+")) {
            return Imagens.VAZIO;
        }
        return cache.computeIfAbsent("id:" + tmdbId, k -> {
            try {
                Filme f = client.get()
                        .uri(u -> comChave(u.path("/movie/{id}")).build(tmdbId))
                        .retrieve()
                        .body(Filme.class);
                return f == null ? Imagens.VAZIO : f.imagens();
            } catch (Exception e) {
                return falha("filme " + tmdbId, e);
            }
        });
    }

    public Imagens buscarPorTitulo(String titulo, Integer ano) {
        if (!configurado() || titulo == null || titulo.isBlank()) {
            return Imagens.VAZIO;
        }
        return cache.computeIfAbsent("q:" + titulo.toLowerCase() + ":" + ano, k -> {
            try {
                Imagens comAno = ano == null ? Imagens.VAZIO : pesquisar(titulo, ano);
                return comAno.vazio() ? pesquisar(titulo, null) : comAno;
            } catch (Exception e) {
                return falha("\"" + titulo + "\"", e);
            }
        });
    }

    private Imagens pesquisar(String titulo, Integer ano) {
        Busca busca = client.get()
                .uri(u -> {
                    comChave(u.path("/search/movie")).queryParam("query", titulo);
                    if (ano != null) u.queryParam("year", ano);
                    return u.build();
                })
                .retrieve()
                .body(Busca.class);
        if (busca == null || busca.results() == null || busca.results().isEmpty()) {
            return Imagens.VAZIO;
        }
        return busca.results().getFirst().imagens();
    }

    private org.springframework.web.util.UriBuilder comChave(org.springframework.web.util.UriBuilder u) {
        return usaToken ? u : u.queryParam("api_key", apiKey);
    }

    private Imagens falha(String alvo, Exception e) {
        if (e instanceof RestClientResponseException r && r.getStatusCode().value() == 401) {
            log.error("TMDB recusou a chave (401). Confira TMDB_API_KEY.");
        } else {
            log.warn("Falha ao buscar {} no TMDB: {}", alvo, e.getMessage());
        }
        return Imagens.VAZIO;
    }

    public record Imagens(String posterUrl, String bannerUrl) {
        public static final Imagens VAZIO = new Imagens(null, null);

        public boolean vazio() {
            return posterUrl == null && bannerUrl == null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Busca(List<Filme> results) { }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Filme(@JsonProperty("poster_path") String posterPath,
                 @JsonProperty("backdrop_path") String backdropPath) {
        Imagens imagens() {
            String poster = posterPath == null ? null : POSTER + posterPath;
            String banner = backdropPath == null ? null : BANNER + backdropPath;
            return new Imagens(poster != null ? poster : banner, banner != null ? banner : poster);
        }
    }
}
