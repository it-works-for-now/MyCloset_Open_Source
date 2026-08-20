package com.mycloset.backend.auth.dto;

public record AuthResponse(String accessToken, String tokenType, UserResponse user) {

    public AuthResponse(String accessToken, UserResponse user) {
        this(accessToken, "Bearer", user);
    }
}
