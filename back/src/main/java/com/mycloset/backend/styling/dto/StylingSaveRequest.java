package com.mycloset.backend.styling.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StylingSaveRequest(
        @NotBlank(message = "\ucf54\ub514 \uc774\ub984\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.") @Size(max = 30)
                String name,
        @Size(max = 200) String memo,
        @NotNull(message = "\ucf54\ub514 \uc637 \uc815\ubcf4\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694.")
                Map<String, StylingItemRequest> items) {}
