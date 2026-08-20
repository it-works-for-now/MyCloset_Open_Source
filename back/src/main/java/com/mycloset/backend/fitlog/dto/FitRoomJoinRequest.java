package com.mycloset.backend.fitlog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FitRoomJoinRequest(@NotBlank @Size(max = 32) String code) {}
