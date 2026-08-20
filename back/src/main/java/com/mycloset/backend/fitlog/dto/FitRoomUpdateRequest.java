package com.mycloset.backend.fitlog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FitRoomUpdateRequest(@NotBlank @Size(max = 100) String name) {}
