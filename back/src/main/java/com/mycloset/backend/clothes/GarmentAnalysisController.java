package com.mycloset.backend.clothes;

import java.nio.charset.StandardCharsets;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/clothes")
public class GarmentAnalysisController {

    private final GarmentAnalysisService garmentAnalysisService;

    public GarmentAnalysisController(GarmentAnalysisService garmentAnalysisService) {
        this.garmentAnalysisService = garmentAnalysisService;
    }

    @PostMapping(
            value = "/analyze",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> analyze(@RequestPart(value = "image", required = false) MultipartFile image) {
        JsonNode analysisResponse = garmentAnalysisService.analyze(image);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(analysisResponse.toString().getBytes(StandardCharsets.UTF_8));
    }
}
