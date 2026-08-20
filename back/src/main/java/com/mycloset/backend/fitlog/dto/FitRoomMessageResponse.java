package com.mycloset.backend.fitlog.dto;

import java.time.LocalDateTime;

public record FitRoomMessageResponse(
        Long id, String author, String text, String type, FitLogQuoteResponse quote, LocalDateTime createdAt) {}
