package com.mycloset.backend.fitlog.dto;

import jakarta.validation.constraints.Size;

public record FitRoomProfileUpdateRequest(@Size(max = 512) String profileImageUrl) {}
