package org.watchlistproject.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.watchlistproject.service.LetterboxdException;

import java.util.Map;

/** Toda resposta de erro da API tem o formato {"erro": "mensagem"}. */
@RestControllerAdvice
public class ErroHandler {

    private static final Logger log = LoggerFactory.getLogger(ErroHandler.class);

    @ExceptionHandler(LetterboxdException.class)
    public ResponseEntity<Map<String, String>> letterboxd(LetterboxdException e) {
        return erro(e.getStatus(), e.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, String>> requisicaoInvalida(Exception e) {
        String msg = e instanceof IllegalArgumentException ? e.getMessage() : "Parâmetros inválidos.";
        return erro(HttpStatus.BAD_REQUEST, msg);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> inesperado(Exception e) {
        if (e instanceof ErrorResponse er) { // ex.: rota inexistente (404), metodo nao suportado (405)
            return ResponseEntity.status(er.getStatusCode()).body(Map.of("erro", String.valueOf(er.getBody().getTitle())));
        }
        log.error("Erro inesperado", e);
        return erro(HttpStatus.INTERNAL_SERVER_ERROR, "Erro inesperado no servidor.");
    }

    private ResponseEntity<Map<String, String>> erro(HttpStatus status, String msg) {
        return ResponseEntity.status(status).body(Map.of("erro", msg));
    }
}
