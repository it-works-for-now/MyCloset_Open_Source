package com.mycloset.backend.dailylook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DailyLookRecommendRequest(
        @NotBlank(message = "원하는 느낌이나 상황을 입력해주세요.") @Size(max = 500) String situation,
        boolean considerWeather,
        Double latitude,
        Double longitude) {}
