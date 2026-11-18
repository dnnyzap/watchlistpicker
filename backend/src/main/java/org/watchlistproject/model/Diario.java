package org.watchlistproject.model;

import java.util.List;

/**
 * Filmes de um periodo. {@code incompleto} indica que o RSS (so ~50 registros) nao alcanca o inicio do
 * periodo, entao pode estar faltando filme; {@code desde} e a data mais antiga que o RSS alcancou.
 */
public record Diario(List<Filme> filmes, boolean incompleto, String desde) { }
