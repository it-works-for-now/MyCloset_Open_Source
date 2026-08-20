package com.mycloset.backend.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import com.mycloset.backend.admin.dto.AdminUserResponse;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.user.Role;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserDeletionService;
import com.mycloset.backend.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserDeletionService userDeletionService;

    private AdminUserService adminUserService;
    private UserAccount admin;
    private UserAccount member;

    @BeforeEach
    void setUp() {
        adminUserService = new AdminUserService(userRepository, userDeletionService);
        admin = user(1L, "admin", "admin@example.com", Role.ADMIN);
        member = user(2L, "member", "member@example.com", Role.USER);
    }

    @Test
    void listsEveryUserWhenNoKeywordIsGiven() {
        when(userRepository.findAllByOrderByUserIdxAsc()).thenReturn(List.of(admin, member));

        List<AdminUserResponse> users = adminUserService.search("  ");

        assertEquals(2, users.size());
        verify(userRepository, never()).searchByKeyword("  ");
    }

    @Test
    void exposesTheLoginIdAsIdSoTheFrontendCanMatchTheSignedInUser() {
        when(userRepository.findByLoginId("member")).thenReturn(Optional.of(member));

        AdminUserResponse response = adminUserService.get("member");

        assertEquals("member", response.id());
        assertEquals("member", response.loginId());
        assertEquals(2L, response.userIdx());
        assertEquals("USER", response.role());
    }

    @Test
    void promotesAMemberToAdmin() {
        when(userRepository.findByLoginId("member")).thenReturn(Optional.of(member));

        AdminUserResponse response = adminUserService.changeRole("admin", "member", "ADMIN");

        assertEquals("ADMIN", response.role());
        assertEquals(Role.ADMIN, member.getRole());
    }

    @Test
    void rejectsChangingYourOwnRole() {
        when(userRepository.findByLoginId("admin")).thenReturn(Optional.of(admin));

        ApiException exception =
                assertThrows(ApiException.class, () -> adminUserService.changeRole("admin", "admin", "USER"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(Role.ADMIN, admin.getRole());
    }

    @Test
    void rejectsDemotingTheLastAdmin() {
        UserAccount otherAdmin = user(3L, "admin2", "admin2@example.com", Role.ADMIN);
        when(userRepository.findByLoginId("admin2")).thenReturn(Optional.of(otherAdmin));
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(1L);

        ApiException exception =
                assertThrows(ApiException.class, () -> adminUserService.changeRole("admin", "admin2", "USER"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(Role.ADMIN, otherAdmin.getRole());
    }

    @Test
    void rejectsAnUnknownRoleValue() {
        when(userRepository.findByLoginId("member")).thenReturn(Optional.of(member));

        ApiException exception =
                assertThrows(ApiException.class, () -> adminUserService.changeRole("admin", "member", "SUPERUSER"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void deletesAMemberThroughTheSharedDeletionService() {
        when(userRepository.findByLoginId("member")).thenReturn(Optional.of(member));

        adminUserService.delete("admin", "member");

        verify(userDeletionService).delete(member);
    }

    @Test
    void rejectsDeletingYourOwnAccount() {
        when(userRepository.findByLoginId("admin")).thenReturn(Optional.of(admin));

        ApiException exception = assertThrows(ApiException.class, () -> adminUserService.delete("admin", "admin"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(userDeletionService, never()).delete(admin);
    }

    @Test
    void returnsNotFoundForAnUnknownUser() {
        when(userRepository.findByLoginId("ghost")).thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class, () -> adminUserService.get("ghost"));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
    }

    private UserAccount user(Long userIdx, String loginId, String email, Role role) {
        UserAccount account = new UserAccount(loginId, "encoded-password", loginId, email);
        ReflectionTestUtils.setField(account, "userIdx", userIdx);
        ReflectionTestUtils.setField(account, "role", role);
        return account;
    }
}
