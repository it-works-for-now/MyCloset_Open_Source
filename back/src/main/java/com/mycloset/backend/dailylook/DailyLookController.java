package com.mycloset.backend.dailylook;

import java.nio.charset.StandardCharsets;
import java.security.Principal;

import jakarta.validation.Valid;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.mycloset.backend.dailylook.dto.DailyLookImageRequest;
import com.mycloset.backend.dailylook.dto.DailyLookImageResponse;
import com.mycloset.backend.dailylook.dto.DailyLookRecommendRequest;

@RestController
@RequestMapping("/api/daily-look")
public class DailyLookController {

    private final DailyLookService dailyLookService;

    public DailyLookController(DailyLookService dailyLookService) {
        this.dailyLookService = dailyLookService;
    }

    @PostMapping("/recommend")
    public ResponseEntity<byte[]> recommend(
            Principal principal, @Valid @RequestBody DailyLookRecommendRequest request) {
        JsonNode response = dailyLookService.recommend(
                principal.getName(),
                request.situation(),
                request.considerWeather(),
                request.latitude(),
                request.longitude());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(response.toString().getBytes(StandardCharsets.UTF_8));
    }

    @PostMapping("/image")
    public DailyLookImageResponse generateImage(
            Principal principal, @Valid @RequestBody DailyLookImageRequest request) {
        return dailyLookService.generateImage(principal.getName(), request);
    }
}
