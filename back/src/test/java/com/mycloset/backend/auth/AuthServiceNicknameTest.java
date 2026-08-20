package com.mycloset.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.mycloset.backend.auth.dto.AuthResponse;
import com.mycloset.backend.auth.dto.SignupRequest;
import com.mycloset.backend.auth.dto.UpdateProfileRequest;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.security.JwtService;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserDeletionService;
import com.mycloset.backend.user.UserRepository;

/** Nicknames identify the author on the board, so they must stay unique across accounts. */
@ExtendWith(MockitoExtension.class)
class AuthServiceNicknameTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserDeletionService userDeletionService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private AuthService authService;
    private UserAccount user;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                authenticationManager,
                jwtService,
                passwordEncoder,
                userDetailsService,
                userRepository,
                userDeletionService);
        user = new UserAccount("closet-user", passwordEncoder.encode("OldPassword1!"), "closet", "closet@example.com");
        ReflectionTestUtils.setField(user, "userIdx", 7L);
        lenient().when(userRepository.findByLoginId("closet-user")).thenReturn(Optional.of(user));
    }

    @Test
    void rejectsSignupWhenTheNicknameIsTaken() {
        when(userRepository.existsByLoginId("newbie")).thenReturn(false);
        when(userRepository.existsByEmail("newbie@example.com")).thenReturn(false);
        when(userRepository.existsByNickname("closet")).thenReturn(true);

        ApiException exception = assertThrows(
                ApiException.class,
                () -> authService.signup(new SignupRequest(
                        "newbie", "Password1!", "Password1!", "closet", "male", "newbie@example.com")));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertEquals("이미 사용 중인 닉네임입니다.", exception.getMessage());
        verify(userRepository, never()).save(any(UserAccount.class));
    }

    @Test
    void savesTheModelGenderProvidedAtSignup() {
        when(userRepository.existsByLoginId("newbie")).thenReturn(false);
        when(userRepository.existsByEmail("newbie@example.com")).thenReturn(false);
        when(userRepository.existsByNickname("newbie")).thenReturn(false);
        UserDetails userDetails = org.mockito.Mockito.mock(UserDetails.class);
        when(userDetailsService.loadUserByUsername("newbie")).thenReturn(userDetails);
        when(jwtService.generateToken(userDetails)).thenReturn("access-token");

        AuthResponse response = authService.signup(
                new SignupRequest("newbie", "Password1!", "Password1!", "newbie", "female", "newbie@example.com"));

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("female", userCaptor.getValue().getModelGender());
        assertEquals("female", response.user().modelGender());
    }

    @Test
    void rejectsAProfileUpdateThatTakesAnotherMembersNickname() {
        when(userRepository.existsByNicknameAndUserIdxNot("taken", 7L)).thenReturn(true);

        ApiException exception = assertThrows(
                ApiException.class,
                () -> authService.updateMe(
                        "closet-user",
                        new UpdateProfileRequest("taken", "closet@example.com", "male", null, null, null)));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertEquals("이미 사용 중인 닉네임입니다.", exception.getMessage());
    }

    @Test
    void allowsKeepingYourOwnNicknameWhileEditingOtherFields() {
        when(userRepository.existsByNicknameAndUserIdxNot("closet", 7L)).thenReturn(false);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

        authService.updateMe(
                "closet-user", new UpdateProfileRequest("closet", "new@example.com", "male", null, null, null));

        assertEquals("closet", user.getNickname());
        assertEquals("new@example.com", user.getEmail());
    }
}
