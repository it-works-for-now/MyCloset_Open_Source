package com.mycloset.backend.styling.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record StylingItemRequest(Long id, Long clothesId) {

    public Long resolvedClothesId() {
        return id != null ? id : clothesId;
    }
}
