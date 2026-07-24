package org.watchlistproject.service;

import org.springframework.http.ResponseEntity;
import org.watchlistproject.model.Filme;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Random;

@Service
public class LetterboxdService {

    private final String TMBD_API_KEY = "d623267b98594bfa0000765419ac6de8";

    public Filme sortear(String user) {
        try {
            String baseUrl = "https://letterboxd.com/" + user + "/watchlist/page/";

            Document firstPage = Jsoup.connect(baseUrl + "1/").userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36").get();

            Elements divPostereses = firstPage.select("div.film-poster");

            if (divPostereses.isEmpty()) {
                throw new RuntimeException("Nenhum filme encontrado para o usuário: " + user);
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
                Document specificPage = Jsoup.connect(baseUrl + randomPage + "/").userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36").get();
                selectedPosters = specificPage.select(".film-poster");
            }

            Element selectedDiv = selectedPosters.get(random.nextInt(selectedPosters.size()));
            String title = selectedDiv.select("img").attr("alt");

            if (!title.isEmpty()) {
                String slug = selectedDiv.attr("data-film-slug");
                String completeLink = "";

                if (slug != null && !slug.isEmpty()) {
                    completeLink = "https://letterboxd.com/film/" + slug + "/";
                } else {

                    String fallbackSlug = title.toLowerCase().replace(" ", "-").replaceAll("[^a-zA-Z0-9-]", "");
                    completeLink = "https://letterboxd.com/film/" + fallbackSlug + "/";
                }
                String bannerUrl = "";
                Document moviePage = Jsoup.connect(completeLink).userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36").get();

                String posterUrl = "";
                try {
                    RestTemplate restTemplate = new RestTemplate();
                    String encodedTitle = URLEncoder.encode(title, StandardCharsets.UTF_8.toString());
                    String tmdbUrl = "https://api.themoviedb.org/3/search/movie?api_key=" + TMBD_API_KEY + "&query=" + encodedTitle;

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
                    System.out.println("Aviso: Erro ao buscar o poster do filme no TMDB: " + e.getMessage() );
                }

                if (bannerUrl == null || bannerUrl.isEmpty()) {
                    bannerUrl = posterUrl;
                }
                if (posterUrl == null || posterUrl.isEmpty()) {
                    posterUrl = bannerUrl;
                }

                return new Filme(title, completeLink, posterUrl, bannerUrl);
            } else {
                throw new RuntimeException("Erro ao acessar a watchlist: Título do filme não encontrado.");
            }
        } catch (Exception e) {
            throw new RuntimeException("Erro ao acessar a watchlist: " + e.getMessage());
        }
    }
}