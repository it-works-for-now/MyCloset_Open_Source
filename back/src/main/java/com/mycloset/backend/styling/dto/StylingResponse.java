package com.mycloset.backend.styling.dto;

import java.time.LocalDateTime;
import java.util.Map;

import com.mycloset.backend.clothes.dto.ClothesResponse;

public record StylingResponse(
        Long id,
        Long stylingId,
        String name,
        String memo,
        Map<String, ClothesResponse> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
