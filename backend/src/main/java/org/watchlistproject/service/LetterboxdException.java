package org.watchlistproject.service;

import org.springframework.http.HttpStatus;

/** Erro com mensagem pronta para o usuario e o status HTTP que a API deve devolver. */
public class LetterboxdException extends RuntimeException {

    private final HttpStatus status;

    public LetterboxdException(HttpStatus status, String mensagem) {
        super(mensagem);
        this.status = status;
    }

    public LetterboxdException(HttpStatus status, String mensagem, Throwable causa) {
        super(mensagem, causa);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
