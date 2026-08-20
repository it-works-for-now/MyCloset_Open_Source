package com.mycloset.backend.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostCommentSaveRequest(
        @NotBlank(message = "댓글 내용을 입력해주세요.") @Size(max = 1000, message = "댓글은 1,000자까지 입력할 수 있습니다.") String content) {}
