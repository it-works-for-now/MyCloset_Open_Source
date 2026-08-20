package com.mycloset.backend.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostSaveRequest(
        /** COORDINATION, QUESTION, REVIEW, FREE 중 하나. 생략하면 FREE 로 저장한다. */
        String category,
        @NotBlank(message = "제목을 입력해주세요.") @Size(max = 100, message = "제목은 100자까지 입력할 수 있습니다.") String title,
        @NotBlank(message = "내용을 입력해주세요.") String content,
        @Size(max = 500, message = "이미지 주소는 500자까지 입력할 수 있습니다.") String imageUrl) {}
