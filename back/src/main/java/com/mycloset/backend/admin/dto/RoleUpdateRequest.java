package com.mycloset.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record RoleUpdateRequest(@NotBlank(message = "변경할 권한을 선택해주세요.") String role) {}
