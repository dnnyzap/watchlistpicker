package org.watchlistproject.controler;

import org.springframework.http.ResponseEntity;
import org.watchlistproject.model.Filme;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.watchlistproject.service.LetterboxdService;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")

public class LetterboxdController {

    @Autowired
    private LetterboxdService letterboxdService;

    @GetMapping("/sortear")
    public ResponseEntity<?> sortearFilme(@RequestParam String user){
        try {
            Filme filmeSorteado = letterboxdService.sortear(user);
            return ResponseEntity.ok(filmeSorteado);
        }catch (Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
