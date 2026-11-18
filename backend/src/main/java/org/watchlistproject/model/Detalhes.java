package org.watchlistproject.model;

import java.util.List;

/** Informacoes da pagina do filme no Letterboxd. Qualquer campo pode vir nulo (ou a lista vazia). */
public record Detalhes(String sinopse, String tagline, String diretor, Integer duracao,
                       Double notaMedia, List<String> generos, String pais) { }
