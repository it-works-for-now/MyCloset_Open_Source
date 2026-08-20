package com.mycloset.backend.dailylook.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotEmpty;

public record DailyLookImageRequest(
        @NotEmpty(message = "이미지를 생성할 코디 슬롯을 입력해주세요.") Map<String, Long> items, List<String> styleKeywords) {}
