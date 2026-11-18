package org.watchlistproject.model;

/**
 * Filme como a API devolve. {@code data}, {@code nota}, {@code revisto} e {@code curtido} vem do diario
 * (RSS) e ficam nulos/false no sorteio da watchlist.
 */
public record Filme(String titulo, Integer ano, String url, String posterUrl, String bannerUrl,
                    String data, Double nota, boolean revisto, boolean curtido) {

    public Filme(String titulo, Integer ano, String url, String posterUrl, String bannerUrl) {
        this(titulo, ano, url, posterUrl, bannerUrl, null, null, false, false);
    }
}
