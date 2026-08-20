package com.mycloset.backend.admin.dto;

import java.time.LocalDateTime;

import com.mycloset.backend.user.UserAccount;

/**
 * The {@code id} field carries the login id, matching {@code UserResponse} so the frontend can
 * compare the signed-in user against rows in the admin list.
 */
public record AdminUserResponse(
        String id,
        String loginId,
        Long userIdx,
        String email,
        String nickname,
        String role,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static AdminUserResponse from(UserAccount user) {
        return new AdminUserResponse(
                user.getLoginId(),
                user.getLoginId(),
                user.getUserIdx(),
                user.getEmail(),
                user.getNickname(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
