package com.mycloset.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "\ub2c9\ub124\uc784\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.")
                @Size(
                        max = 40,
                        message =
                                "\ub2c9\ub124\uc784\uc740 40\uc790 \uc774\ud558\ub85c \uc785\ub825\ud574\uc8fc\uc138\uc694.")
                String nickname,
        @NotBlank(message = "\uc774\uba54\uc77c\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.")
                @Email(message = "\uc62c\ubc14\ub978 \uc774\uba54\uc77c \ud615\uc2dd\uc774 \uc544\ub2d9\ub2c8\ub2e4.")
                @Size(
                        max = 120,
                        message =
                                "\uc774\uba54\uc77c\uc740 120\uc790 \uc774\ud558\ub85c \uc785\ub825\ud574\uc8fc\uc138\uc694.")
                String email,
        @NotBlank(message = "AI 모델 성별을 선택해주세요.") @Pattern(regexp = "male|female", message = "AI 모델 성별 값이 올바르지 않습니다.")
                String modelGender,
        String currentPassword,
        String password,
        String passwordConfirm) {}
