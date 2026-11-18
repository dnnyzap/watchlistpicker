package org.watchlistproject.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.watchlistproject.model.Diario;
import org.watchlistproject.model.Filme;
import org.watchlistproject.service.LetterboxdService;
import org.watchlistproject.service.TmdbService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class LetterboxdController {

    private final LetterboxdService letterboxd;
    private final TmdbService tmdb;

    public LetterboxdController(LetterboxdService letterboxd, TmdbService tmdb) {
        this.letterboxd = letterboxd;
        this.tmdb = tmdb;
    }

    @GetMapping("/sortear")
    public Filme sortearWatchlist(@RequestParam String user) {
        return letterboxd.sortearWatchlist(user);
    }

    @GetMapping("/sortear-recente")
    public Filme sortearRecente(@RequestParam String user) {
        return letterboxd.sortearRecente(user);
    }

    @GetMapping("/sortear-assistidos")
    public Filme sortearAssistidos(@RequestParam String user) {
        return letterboxd.sortearAssistidos(user);
    }

    /** {@code lista}: link de uma lista publica do Letterboxd, ou "usuario/list/nome". */
    @GetMapping("/sortear-lista")
    public Filme sortearLista(@RequestParam String lista) {
        return letterboxd.sortearLista(lista);
    }

    /** Sem {@code mes}, devolve o ano inteiro. */
    @GetMapping("/diario")
    public Diario diario(@RequestParam String user, @RequestParam int ano,
                         @RequestParam(required = false) Integer mes) {
        return letterboxd.buscarDiario(user, ano, mes);
    }

    /** Posteres para filmes que vieram do export do Letterboxd (titulo + ano), na mesma ordem do pedido. */
    @PostMapping("/imagens")
    public List<TmdbService.Imagens> imagens(@RequestBody List<TmdbService.Pedido> pedidos) {
        if (pedidos.size() > 400) {
            throw new IllegalArgumentException("No máximo 400 filmes por vez.");
        }
        return tmdb.buscarVarios(pedidos);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "UP", "tmdb", tmdb.configurado());
    }
}
