package org.watchlistproject.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.watchlistproject.model.Filme;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Random;

@Service
public class LetterboxdService {

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    private static final int REQUEST_TIMEOUT_MILLIS = 10000;

    @Value("${tmdb.api.key:${TMDB_API_KEY:}}")
    private String tmdbApiKey;

    public Filme sortear(String user) {
        try {
            String sanitizedUser = validarUsuario(user);
            String baseUrl = "https://letterboxd.com/" + sanitizedUser + "/watchlist/page/";

            Document firstPage = conectar(baseUrl + "1/").get();
            Elements divPostereses = firstPage.select("div.film-poster");

            if (divPostereses.isEmpty()) {
                throw new RuntimeException("Nenhum filme encontrado para o usuario: " + sanitizedUser);
            }

            int allPages = 1;
            Elements pagination = firstPage.select("div.paginate-pages a.paginate-page");

            if (!pagination.isEmpty()) {
                String lastPageStr = pagination.last().text();
                allPages = Integer.parseInt(lastPageStr.replace(",", ""));
            }

            Random random = new Random();
            int randomPage = random.nextInt(allPages) + 1;
            Elements selectedPosters;

            if (randomPage == 1) {
                selectedPosters = divPostereses;
            } else {
                Document specificPage = conectar(baseUrl + randomPage + "/").get();
                selectedPosters = specificPage.select(".film-poster");
            }

            if (selectedPosters.isEmpty()) {
                throw new RuntimeException("Nenhum filme encontrado na pagina sorteada.");
            }

            Element selectedDiv = selectedPosters.get(random.nextInt(selectedPosters.size()));
            String title = selectedDiv.select("img").attr("alt");

            if (!title.isEmpty()) {
                String slug = selectedDiv.attr("data-film-slug");
                String completeLink;

                if (slug != null && !slug.isEmpty()) {
                    completeLink = "https://letterboxd.com/film/" + slug + "/";
                } else {
                    String fallbackSlug = title.toLowerCase().replace(" ", "-").replaceAll("[^a-zA-Z0-9-]", "");
                    completeLink = "https://letterboxd.com/film/" + fallbackSlug + "/";
                }

                String posterUrl = "";
                String bannerUrl = "";

                try {
                    if (tmdbApiKey == null || tmdbApiKey.isBlank()) {
                        throw new IllegalStateException("Chave TMDB nao configurada.");
                    }

                    RestTemplate restTemplate = criarRestTemplate();
                    String encodedTitle = URLEncoder.encode(title, StandardCharsets.UTF_8.toString());
                    String tmdbUrl = "https://api.themoviedb.org/3/search/movie?api_key=" + tmdbApiKey + "&query=" + encodedTitle;

                    ResponseEntity<String> response = restTemplate.getForEntity(tmdbUrl, String.class);
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode root = mapper.readTree(response.getBody());

                    if (root != null && root.has("results") && root.get("results").size() > 0) {
                        JsonNode firstResult = root.get("results").get(0);

                        if (firstResult.has("poster_path") && !firstResult.get("poster_path").isNull()) {
                            String posterPath = firstResult.get("poster_path").asText();
                            posterUrl = "https://image.tmdb.org/t/p/w500" + posterPath;
                        }

                        if (firstResult.has("backdrop_path") && !firstResult.get("backdrop_path").isNull()) {
                            bannerUrl = "https://image.tmdb.org/t/p/w1280" + firstResult.get("backdrop_path").asText();
                        }
                    }
                } catch (Exception e) {
                    System.out.println("Aviso: Erro ao buscar o poster do filme no TMDB: " + e.getMessage());
                }

                if (bannerUrl == null || bannerUrl.isEmpty()) {
                    bannerUrl = posterUrl;
                }
                if (posterUrl == null || posterUrl.isEmpty()) {
                    posterUrl = bannerUrl;
                }

                return new Filme(title, completeLink, posterUrl, bannerUrl);
            } else {
                throw new RuntimeException("Erro ao acessar a watchlist: titulo do filme nao encontrado.");
            }
        } catch (Exception e) {
            throw new RuntimeException("Erro ao acessar a watchlist: " + e.getMessage());
        }
    }

    private String validarUsuario(String user) {
        if (user == null || !user.trim().matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("Usuario invalido.");
        }

        return user.trim();
    }

    private Connection conectar(String url) {
        return Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .timeout(REQUEST_TIMEOUT_MILLIS);
    }

    private RestTemplate criarRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(REQUEST_TIMEOUT_MILLIS);
        factory.setReadTimeout(REQUEST_TIMEOUT_MILLIS);
        return new RestTemplate(factory);
    }
}
