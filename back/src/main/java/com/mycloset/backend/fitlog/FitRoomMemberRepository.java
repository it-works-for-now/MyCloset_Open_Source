package com.mycloset.backend.fitlog;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FitRoomMemberRepository extends JpaRepository<FitRoomMember, Long> {

    @Query(
            """
			select m from FitRoomMember m
			join fetch m.room r
			join fetch r.host
			where m.user.userIdx = :userIdx and m.memberStatus = :status
			order by r.updatedAt desc
			""")
    List<FitRoomMember> findAllByUserIdxAndStatus(
            @Param("userIdx") Long userIdx, @Param("status") FitRoomMemberStatus status);

    @Query(
            """
			select m from FitRoomMember m
			join fetch m.user
			where m.room.roomIdx = :roomIdx and m.memberStatus = :status
			order by m.joinedAt asc
			""")
    List<FitRoomMember> findAllByRoomIdxAndStatus(
            @Param("roomIdx") Long roomIdx, @Param("status") FitRoomMemberStatus status);

    Optional<FitRoomMember> findByRoom_RoomIdxAndUser_UserIdx(Long roomIdx, Long userIdx);

    @Query(
            """
			select m from FitRoomMember m
			join fetch m.room r
			join fetch m.user
			where r.roomCode = :roomCode and m.user.userIdx = :userIdx and m.memberStatus = :status
			""")
    Optional<FitRoomMember> findActiveByRoomCodeAndUserIdx(
            @Param("roomCode") String roomCode,
            @Param("userIdx") Long userIdx,
            @Param("status") FitRoomMemberStatus status);

    @Query(
            """
			select m from FitRoomMember m
			join fetch m.room r
			join fetch r.host
			join fetch m.user
			where r.roomIdx = :roomIdx and m.user.userIdx = :userIdx and m.memberStatus = :status
			""")
    Optional<FitRoomMember> findActiveByRoomIdxAndUserIdx(
            @Param("roomIdx") Long roomIdx,
            @Param("userIdx") Long userIdx,
            @Param("status") FitRoomMemberStatus status);

    long countByRoom_RoomIdxAndMemberStatus(Long roomIdx, FitRoomMemberStatus memberStatus);

    @Query(
            """
			select m.profileImageUrl from FitRoomMember m
			where m.room.roomIdx = :roomIdx and m.profileImageUrl is not null
			""")
    List<String> findProfileImageUrlsByRoomIdx(@Param("roomIdx") Long roomIdx);

    @Modifying
    @Query("delete from FitRoomMember m where m.room.roomIdx = :roomIdx")
    void deleteAllByRoomIdx(@Param("roomIdx") Long roomIdx);

    /** Includes every member profile in rooms the user hosts because those rooms are removed by FK cascade. */
    @Query(
            """
			select distinct m.profileImageUrl from FitRoomMember m
			where m.profileImageUrl is not null
			and (m.user.userIdx = :userIdx or m.room.host.userIdx = :userIdx)
			""")
    List<String> findProfileImageUrlsAffectedByUserDeletion(@Param("userIdx") Long userIdx);
}
