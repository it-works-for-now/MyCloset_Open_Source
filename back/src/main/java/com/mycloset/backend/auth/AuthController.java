package com.mycloset.backend.auth;

import java.security.Principal;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mycloset.backend.auth.dto.AuthResponse;
import com.mycloset.backend.auth.dto.CurrentPasswordRequest;
import com.mycloset.backend.auth.dto.LoginRequest;
import com.mycloset.backend.auth.dto.PasswordVerificationResponse;
import com.mycloset.backend.auth.dto.SignupRequest;
import com.mycloset.backend.auth.dto.UpdateProfileRequest;
import com.mycloset.backend.auth.dto.UserResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public AuthResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(Principal principal) {
        return authService.me(principal.getName());
    }

    @PatchMapping("/me")
    public UserResponse updateMe(Principal principal, @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateMe(principal.getName(), request);
    }

    @PostMapping("/password/verify")
    public PasswordVerificationResponse verifyCurrentPassword(
            Principal principal, @Valid @RequestBody CurrentPasswordRequest request) {
        authService.verifyCurrentPassword(principal.getName(), request.currentPassword());
        return new PasswordVerificationResponse(true);
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMe(Principal principal) {
        authService.deleteMe(principal.getName());
    }
}
