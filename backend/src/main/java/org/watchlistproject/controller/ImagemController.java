package org.watchlistproject.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.watchlistproject.service.LetterboxdException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Repassa posteres do TMDB e do Letterboxd pela propria API. O frontend desenha as imagens num canvas
 * para gerar o story, e o canvas so exporta imagens servidas com CORS — o CDN do Letterboxd nao manda.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ImagemController {

    private static final Set<String> HOSTS_PERMITIDOS = Set.of("image.tmdb.org", "a.ltrbxd.com", "s.ltrbxd.com");

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    @GetMapping("/imagem")
    public ResponseEntity<byte[]> imagem(@RequestParam String url) throws InterruptedException {
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("URL de imagem inválida.");
        }
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || !HOSTS_PERMITIDOS.contains(uri.getHost())
                || uri.getPort() != -1 || uri.getUserInfo() != null) {
            throw new IllegalArgumentException("Só imagens do TMDB e do Letterboxd são permitidas.");
        }

        HttpResponse<byte[]> resp;
        try {
            resp = http.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10)).GET().build(),
                    HttpResponse.BodyHandlers.ofByteArray());
        } catch (java.io.IOException e) {
            throw new LetterboxdException(org.springframework.http.HttpStatus.BAD_GATEWAY, "Falha ao baixar a imagem.", e);
        }

        String tipo = resp.headers().firstValue("Content-Type").orElse("");
        if (resp.statusCode() != 200 || !tipo.startsWith("image/")) {
            throw new LetterboxdException(org.springframework.http.HttpStatus.BAD_GATEWAY, "Imagem indisponível.");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(tipo))
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .body(resp.body());
    }
}
