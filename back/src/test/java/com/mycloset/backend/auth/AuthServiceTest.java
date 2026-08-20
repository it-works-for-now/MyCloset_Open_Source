package com.mycloset.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.mycloset.backend.auth.dto.UpdateProfileRequest;
import com.mycloset.backend.auth.dto.UserResponse;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserDeletionService;
import com.mycloset.backend.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserDeletionService userDeletionService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private AuthService authService;
    private UserAccount user;

    @BeforeEach
    void setUp() {
        authService = new AuthService(null, null, passwordEncoder, null, userRepository, userDeletionService);
        user = new UserAccount("closet-user", passwordEncoder.encode("OldPassword1!"), "closet", "closet@example.com");
        when(userRepository.findByLoginId("closet-user")).thenReturn(Optional.of(user));
    }

    @Test
    void updatesNicknameEmailAndPasswordAfterCheckingTheCurrentPassword() {
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

        UserResponse response = authService.updateMe(
                "closet-user",
                new UpdateProfileRequest(
                        "new-closet", "new@example.com", "female", "OldPassword1!", "NewPassword1!", "NewPassword1!"));

        assertEquals("new-closet", response.nickname());
        assertEquals("new@example.com", response.email());
        assertEquals("female", response.modelGender());
        assertEquals("female", user.getModelGender());
        assertTrue(passwordEncoder.matches("NewPassword1!", user.getPassword()));
    }

    @Test
    void rejectsPasswordChangeWhenTheCurrentPasswordDoesNotMatch() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> authService.updateMe(
                        "closet-user",
                        new UpdateProfileRequest(
                                "closet",
                                "closet@example.com",
                                "male",
                                "wrong-password",
                                "NewPassword1!",
                                "NewPassword1!")));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertTrue(passwordEncoder.matches("OldPassword1!", user.getPassword()));
    }

    @Test
    void rejectsReusingTheExistingPassword() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> authService.updateMe(
                        "closet-user",
                        new UpdateProfileRequest(
                                "closet",
                                "closet@example.com",
                                "male",
                                "OldPassword1!",
                                "OldPassword1!",
                                "OldPassword1!")));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void rejectsEmailAlreadyUsedByAnotherAccount() {
        when(userRepository.existsByEmail("used@example.com")).thenReturn(true);

        ApiException exception = assertThrows(
                ApiException.class,
                () -> authService.updateMe(
                        "closet-user",
                        new UpdateProfileRequest("closet", "used@example.com", "male", null, null, null)));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
    }

    @Test
    void verifiesTheCurrentPasswordAndDeletesTheAuthenticatedAccount() {
        authService.verifyCurrentPassword("closet-user", "OldPassword1!");
        authService.deleteMe("closet-user");

        verify(userDeletionService).delete(user);
    }
}
