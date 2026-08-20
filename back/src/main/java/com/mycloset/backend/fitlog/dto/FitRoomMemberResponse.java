package com.mycloset.backend.fitlog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record FitRoomMemberResponse(
        Long id, String name, String avatar, String fitImage, String caption, @JsonProperty("isHost") boolean isHost) {}
