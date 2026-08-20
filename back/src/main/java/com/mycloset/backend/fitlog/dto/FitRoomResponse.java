package com.mycloset.backend.fitlog.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

public record FitRoomResponse(
        Long id,
        Long roomId,
        String code,
        String name,
        String status,
        String recentMessageAuthor,
        @JsonProperty("isFitComplete") boolean isFitComplete,
        Integer memberLimit,
        String role,
        @JsonProperty("isHost") boolean isHost,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
