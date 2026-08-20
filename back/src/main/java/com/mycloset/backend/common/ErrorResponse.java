package com.mycloset.backend.common;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(String message, Map<String, String> errors, Instant timestamp) {

    public static ErrorResponse of(String message) {
        return new ErrorResponse(message, Map.of(), Instant.now());
    }

    public static ErrorResponse of(String message, Map<String, String> errors) {
        return new ErrorResponse(message, errors, Instant.now());
    }
}
