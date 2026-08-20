package com.mycloset.backend.clothes.dto;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ClothesSaveRequest(
        @Size(max = 50) String alias,
        @NotBlank(message = "카테고리를 입력해주세요.") @Size(max = 30) String category,
        @NotBlank(message = "세부 카테고리를 입력해주세요.") @Size(max = 50) String subcategory,
        @Size(max = 30) String pattern,
        @NotNull(message = "색상을 입력해주세요.") @Size(min = 1, message = "색상을 하나 이상 입력해주세요.")
                List<@NotBlank(message = "색상을 입력해주세요.") @Size(max = 30) String> colors,
        @NotNull(message = "계절 정보를 입력해주세요.") List<@NotBlank(message = "계절 정보를 입력해주세요.") @Size(max = 20) String> seasons,
        @NotNull(message = "스타일 태그를 입력해주세요.")
                List<@NotBlank(message = "스타일 태그를 입력해주세요.") @Size(max = 50) String> styleTags,
        @Min(value = 1, message = "보온감은 1에서 5 사이여야 합니다.") @Max(value = 5, message = "보온감은 1에서 5 사이여야 합니다.")
                Integer warmthLevel,
        @Size(max = 1000) String memo,
        @Size(max = 500) String imageUrl) {}
