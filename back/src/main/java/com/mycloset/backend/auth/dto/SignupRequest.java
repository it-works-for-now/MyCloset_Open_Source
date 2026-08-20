package com.mycloset.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "아이디를 입력해주세요.") @Size(max = 50, message = "아이디는 50자 이하로 입력해주세요.") String id,
        @NotBlank(message = "비밀번호를 입력해주세요.") @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.") String password,
        @NotBlank(message = "비밀번호 확인을 입력해주세요.") String passwordConfirm,
        @NotBlank(message = "닉네임을 입력해주세요.") @Size(max = 40, message = "닉네임은 40자 이하로 입력해주세요.") String nickname,
        @NotBlank(message = "AI 모델 성별을 선택해주세요.") @Pattern(regexp = "male|female", message = "AI 모델 성별 값이 올바르지 않습니다.")
                String modelGender,
        @NotBlank(message = "이메일을 입력해주세요.")
                @Email(message = "올바른 이메일 형식이 아닙니다.")
                @Size(max = 120, message = "이메일은 120자 이하로 입력해주세요.")
                String email) {}
