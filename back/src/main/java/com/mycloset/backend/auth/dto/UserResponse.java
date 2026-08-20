package com.mycloset.backend.auth.dto;

import com.mycloset.backend.user.UserAccount;

public record UserResponse(Long userIdx, String id, String email, String nickname, String modelGender, String role) {

    public static UserResponse from(UserAccount user) {
        return new UserResponse(
                user.getUserIdx(),
                user.getLoginId(),
                user.getEmail(),
                user.getNickname(),
                user.getModelGender(),
                user.getRole().name());
    }
}
