package com.mycloset.backend.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mycloset.backend.admin.dto.AdminUserResponse;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.user.Role;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserDeletionService;
import com.mycloset.backend.user.UserRepository;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final UserDeletionService userDeletionService;

    public AdminUserService(UserRepository userRepository, UserDeletionService userDeletionService) {
        this.userRepository = userRepository;
        this.userDeletionService = userDeletionService;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> search(String query) {
        List<UserAccount> users = (query == null || query.isBlank())
                ? userRepository.findAllByOrderByUserIdxAsc()
                : userRepository.searchByKeyword(query.trim());
        return users.stream().map(AdminUserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AdminUserResponse get(String loginId) {
        return AdminUserResponse.from(findUser(loginId));
    }

    @Transactional
    public AdminUserResponse changeRole(String actorLoginId, String targetLoginId, String role) {
        UserAccount target = findUser(targetLoginId);
        Role nextRole = parseRole(role);

        if (target.getLoginId().equals(actorLoginId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "본인의 권한은 변경할 수 없습니다.");
        }
        if (target.getRole() == Role.ADMIN && nextRole != Role.ADMIN && isLastAdmin()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "마지막 관리자의 권한은 변경할 수 없습니다.");
        }

        target.changeRole(nextRole);
        return AdminUserResponse.from(target);
    }

    @Transactional
    public void delete(String actorLoginId, String targetLoginId) {
        UserAccount target = findUser(targetLoginId);

        if (target.getLoginId().equals(actorLoginId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "본인 계정은 관리자 기능으로 삭제할 수 없습니다.");
        }
        if (target.getRole() == Role.ADMIN && isLastAdmin()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "마지막 관리자는 삭제할 수 없습니다.");
        }

        userDeletionService.delete(target);
    }

    private boolean isLastAdmin() {
        return userRepository.countByRole(Role.ADMIN) <= 1;
    }

    private Role parseRole(String role) {
        try {
            return Role.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "지원하지 않는 권한입니다.");
        }
    }

    private UserAccount findUser(String loginId) {
        return userRepository
                .findByLoginId(loginId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."));
    }
}
