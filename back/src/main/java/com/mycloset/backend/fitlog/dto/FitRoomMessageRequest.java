package com.mycloset.backend.fitlog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonAlias;

public record FitRoomMessageRequest(
        @JsonAlias("content") @NotBlank @Size(max = 2000) String text,
        @JsonAlias("messageType") @Size(max = 20) String type,
        @Size(max = 32) String quotedMemberId) {}
