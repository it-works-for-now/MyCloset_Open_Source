package com.mycloset.backend.fitlog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FitLogSaveRequest(@NotBlank @Size(max = 512) String imageUrl, @Size(max = 1000) String caption) {}
