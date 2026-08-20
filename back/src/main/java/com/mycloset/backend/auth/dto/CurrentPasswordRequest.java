package com.mycloset.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record CurrentPasswordRequest(
        @NotBlank(message = "\ud604\uc7ac \ube44\ubc00\ubc88\ud638\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694.")
                String currentPassword) {}
