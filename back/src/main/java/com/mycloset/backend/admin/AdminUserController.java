package com.mycloset.backend.admin;

import java.security.Principal;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mycloset.backend.admin.dto.AdminUserResponse;
import com.mycloset.backend.admin.dto.RoleUpdateRequest;

/** Access is restricted to ROLE_ADMIN by the security filter chain. */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public List<AdminUserResponse> list(@RequestParam(name = "query", required = false) String query) {
        return adminUserService.search(query);
    }

    @GetMapping("/{userId}")
    public AdminUserResponse detail(@PathVariable String userId) {
        return adminUserService.get(userId);
    }

    @PatchMapping("/{userId}/role")
    public AdminUserResponse changeRole(
            Principal principal, @PathVariable String userId, @Valid @RequestBody RoleUpdateRequest request) {
        return adminUserService.changeRole(principal.getName(), userId, request.role());
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable String userId) {
        adminUserService.delete(principal.getName(), userId);
    }
}
