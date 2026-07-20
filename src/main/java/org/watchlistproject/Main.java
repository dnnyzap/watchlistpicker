package org.watchlistproject;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;


import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Scanner;



public class Main {

    public record Filme(String titulo, String url) {
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("Nome de usuário: ");
        String usuario = scanner.nextLine().trim();

        List<Filme> allMovies = new ArrayList<>();
        int atualPage = 1;
        boolean moreMovies = true;

        try {
            while (moreMovies) {
                String urlPage = "https://letterboxd.com/" + usuario + "/watchlist/page/" + atualPage + "/";
                Document document = Jsoup.connect(urlPage).userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3").get();


                Elements divPostereses = document.select(".film-poster");

                if (divPostereses.isEmpty()) {
                    moreMovies = false;
                } else {
                    System.out.println("Lendo página " + atualPage + "...");


                    for (Element div : divPostereses) {
                        String titulo = div.select("img").attr("alt");

                        if(!titulo.isEmpty()){
                            String slug = titulo.toLowerCase().replace(" ", "-").replaceAll("[^a-zA-Z0-9-]", "");
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
                Filme moviechoice = allMovies.get(random.nextInt(allMovies.size()));

                System.out.println("\n=======================");
                System.out.println("Total de filmes encontrados: " + allMovies.size());
                System.out.println("O Filme sorteado foi: " + moviechoice.titulo());
                System.out.println("Link: " + moviechoice.url());
                System.out.println("\n=======================");
            } else {
                System.out.println("Nenhum filme encontrado na watchlist do usuário " + usuario);
            }
        } catch (Exception e) {
            System.out.println("Ocorreu um erro: " + e.getMessage());
        } finally {
            scanner.close();
        }
    }
}

