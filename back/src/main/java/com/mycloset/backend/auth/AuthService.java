package com.mycloset.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mycloset.backend.auth.dto.AuthResponse;
import com.mycloset.backend.auth.dto.LoginRequest;
import com.mycloset.backend.auth.dto.SignupRequest;
import com.mycloset.backend.auth.dto.UpdateProfileRequest;
import com.mycloset.backend.auth.dto.UserResponse;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.security.JwtService;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserDeletionService;
import com.mycloset.backend.user.UserRepository;

@Service
public class AuthService {

    private static final String PASSWORD_PATTERN = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final UserDeletionService userDeletionService;

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            UserDetailsService userDetailsService,
            UserRepository userRepository,
            UserDeletionService userDeletionService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.userDeletionService = userDeletionService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String loginId = request.id().trim();
        String email = request.email().trim().toLowerCase();
        String nickname = request.nickname().trim();

        if (!request.password().equals(request.passwordConfirm())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }
        if (userRepository.existsByLoginId(loginId)) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }
        if (userRepository.existsByNickname(nickname)) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다.");
        }

        UserAccount user = new UserAccount(
                loginId, passwordEncoder.encode(request.password()), nickname, email, request.modelGender());
        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(loginId);
        String accessToken = jwtService.generateToken(userDetails);
        return new AuthResponse(accessToken, UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String loginId = request.id().trim();
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(loginId, request.password()));
        } catch (BadCredentialsException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        UserAccount user = findByLoginId(loginId);
        UserDetails userDetails = userDetailsService.loadUserByUsername(loginId);
        String accessToken = jwtService.generateToken(userDetails);
        return new AuthResponse(accessToken, UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public UserResponse me(String loginId) {
        return UserResponse.from(findByLoginId(loginId));
    }

    @Transactional
    public UserResponse updateMe(String loginId, UpdateProfileRequest request) {
        UserAccount user = findByLoginId(loginId);
        String nickname = request.nickname().trim();
        String email = request.email().trim().toLowerCase();

        if (!user.getEmail().equalsIgnoreCase(email) && userRepository.existsByEmail(email)) {
            throw new ApiException(
                    HttpStatus.CONFLICT, "\uc774\ubbf8 \uac00\uc785\ub41c \uc774\uba54\uc77c\uc785\ub2c8\ub2e4.");
        }
        if (userRepository.existsByNicknameAndUserIdxNot(nickname, user.getUserIdx())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "\uc774\ubbf8 \uc0ac\uc6a9 \uc911\uc778 \ub2c9\ub124\uc784\uc785\ub2c8\ub2e4.");
        }

        if (hasPasswordChange(request)) {
            validatePasswordChange(user, request);
            user.changePassword(passwordEncoder.encode(request.password()));
        }

        user.updateProfile(nickname, email, request.modelGender());
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public void verifyCurrentPassword(String loginId, String currentPassword) {
        UserAccount user = findByLoginId(loginId);
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "\ud604\uc7ac \ube44\ubc00\ubc88\ud638\uac00 \uc77c\uce58\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
        }
    }

    @Transactional
    public void deleteMe(String loginId) {
        userDeletionService.delete(findByLoginId(loginId));
    }

    private boolean hasPasswordChange(UpdateProfileRequest request) {
        return hasText(request.currentPassword()) || hasText(request.password()) || hasText(request.passwordConfirm());
    }

    private void validatePasswordChange(UserAccount user, UpdateProfileRequest request) {
        if (!hasText(request.currentPassword())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "\ud604\uc7ac \ube44\ubc00\ubc88\ud638\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694.");
        }
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "\ud604\uc7ac \ube44\ubc00\ubc88\ud638\uac00 \uc77c\uce58\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
        }
        if (!hasText(request.password())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "\uc0c8 \ube44\ubc00\ubc88\ud638\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694.");
        }
        if (!request.password().equals(request.passwordConfirm())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "\ube44\ubc00\ubc88\ud638\uc640 \ube44\ubc00\ubc88\ud638 \ud655\uc778\uc774 \uc77c\uce58\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
        }
        if (!request.password().matches(PASSWORD_PATTERN)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "\ube44\ubc00\ubc88\ud638\ub294 \uc601\ubb38, \uc22b\uc790, \ud2b9\uc218\ubb38\uc790\ub97c \ud3ec\ud568\ud55c 8\uc790 \uc774\uc0c1\uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4.");
        }
        if (passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "\uc774\uc804 \ube44\ubc00\ubc88\ud638\uc640 \uac19\uc2b5\ub2c8\ub2e4.");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private UserAccount findByLoginId(String loginId) {
        return userRepository
                .findByLoginId(loginId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }
}
