package org.watchlistproject.service;

import org.watchlistproject.model.Filme;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class LetterboxdService {

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

                Document moviePage = Jsoup.connect(completeLink).userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36").get();

                String posterUrl = "";

                Element posterDiv = moviePage.selectFirst("div.film-poster");
                if (posterDiv != null) {
                    Element img = posterDiv.selectFirst("img");
                    if (img != null) {
                        posterUrl = img.attr("src");

                        }
                    }
                if (posterUrl.isEmpty() || posterUrl.contains("empty-poster")) {
                    Element metaImage = moviePage.selectFirst("meta[property=og:image]");
                    if (metaImage != null) {
                        posterUrl = metaImage.attr("content");
                    }
                }


                return new Filme(title, completeLink, posterUrl);
            } else {
                throw new RuntimeException("Erro ao acessar a watchlist: Título do filme não encontrado.");
            }
        } catch (Exception e) {
            throw new RuntimeException("Erro ao acessar a watchlist: " + e.getMessage());
        }
    }
}