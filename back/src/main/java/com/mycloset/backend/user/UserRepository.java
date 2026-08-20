package com.mycloset.backend.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByLoginId(String loginId);

    Optional<UserAccount> findByEmail(String email);

    boolean existsByLoginId(String loginId);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    boolean existsByNicknameAndUserIdxNot(String nickname, Long userIdx);

    List<UserAccount> findAllByOrderByUserIdxAsc();

    @Query(
            """
			select u from UserAccount u
			where lower(u.email) like lower(concat('%', :keyword, '%'))
			   or lower(u.loginId) like lower(concat('%', :keyword, '%'))
			   or lower(u.nickname) like lower(concat('%', :keyword, '%'))
			order by u.userIdx asc
			""")
    List<UserAccount> searchByKeyword(@Param("keyword") String keyword);

    long countByRole(Role role);
}
