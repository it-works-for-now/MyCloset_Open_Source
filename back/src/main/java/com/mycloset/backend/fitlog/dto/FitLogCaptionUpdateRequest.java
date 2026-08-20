package com.mycloset.backend.fitlog.dto;

import jakarta.validation.constraints.Size;

public record FitLogCaptionUpdateRequest(@Size(max = 1000) String caption) {}
