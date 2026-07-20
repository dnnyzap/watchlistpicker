package org.watchlistproject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Main {
    public static void main(String[] args) {
        SpringApplication.run(Main.class, args);
        System.out.println("Aplicação iniciada com sucesso! Acesso em: http://localhost:8080/api/sortear?user=USUARIO");
    }
}