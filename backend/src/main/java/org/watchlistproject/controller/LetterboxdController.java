package org.watchlistproject.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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

    @GetMapping("/diario")
    public List<Filme> diario(@RequestParam String user, @RequestParam int ano, @RequestParam int mes) {
        return letterboxd.buscarDiario(user, ano, mes);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "UP", "tmdb", tmdb.configurado());
    }
}
