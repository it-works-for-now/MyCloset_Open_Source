package com.mycloset.backend.clothes.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.mycloset.backend.clothes.Clothes;

public record ClothesResponse(
        Long id,
        Long clothesId,
        String alias,
        String name,
        String category,
        String subcategory,
        List<String> colors,
        String pattern,
        List<String> seasons,
        List<String> styleTags,
        Integer warmthLevel,
        String memo,
        String imageUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static ClothesResponse from(Clothes clothes) {
        String alias = clothes.getAlias();
        return new ClothesResponse(
                clothes.getClothesIdx(),
                clothes.getClothesIdx(),
                alias,
                alias,
                clothes.getCategory(),
                clothes.getSubcategory(),
                List.copyOf(clothes.getColors()),
                clothes.getPattern(),
                List.copyOf(clothes.getSeasons()),
                List.copyOf(clothes.getStyleTags()),
                clothes.getWarmthLevel(),
                clothes.getMemo(),
                clothes.getImageUrl(),
                clothes.getCreatedAt(),
                clothes.getUpdatedAt());
    }
}
