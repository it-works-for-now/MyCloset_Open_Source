package com.mycloset.backend.fitlog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FitRoomCreateRequest(
        @NotBlank @Size(max = 100) String name, @NotNull @Min(1) @Max(8) Integer memberLimit) {}
