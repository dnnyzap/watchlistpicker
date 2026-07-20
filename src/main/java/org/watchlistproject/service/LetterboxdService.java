package org.watchlistproject.service;

import org.watchlistproject.model.Filme;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.ArrayList;
import java.util.Random;

@Service
public class LetterboxdService {

    public Filme sortear(String user) {
        List<Filme> allMovies = new ArrayList<>();
        int atualPage = 1;
        boolean moreMovies = true;

        try {
            while(moreMovies) {
                String urlPage = "https://letterboxd.com/" + user + "/watchlist/page/" + atualPage + "/";

                Document document = Jsoup.connect(urlPage).userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36").get();

                Elements divPostereses = document.select(".film-poster");

                if (divPostereses.isEmpty()) {
                    moreMovies = false;
                } else {
                    for (Element div : divPostereses) {
                        String titulo = div.select("img").attr("alt");

                        if (!titulo.isEmpty()) {
                            String slug = titulo.toLowerCase().replace(" ", "-").replace("[^a-zA-Z0-9-]", "");
                            String completeLink = "https://letterboxd.com/film/" + slug + "/";
                            allMovies.add(new Filme(titulo, completeLink));

                        }
                    }
                    atualPage++;
                    Thread.sleep(500);
                }


            }
            if (!allMovies.isEmpty()) {
                Random random = new Random();
                return allMovies.get(random.nextInt(allMovies.size()));
            } else {
                throw new RuntimeException("Nenhum filme encontrado na watchlist do usuário: " + user);
            }
        } catch (Exception e) {
            throw new RuntimeException("Erro ao acessar a watchlist: " + e.getMessage());
        }
    }
}
