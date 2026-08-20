package com.mycloset.backend.fitlog;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FitLogRepository extends JpaRepository<FitLog, Long> {

    Optional<FitLog> findByRoom_RoomIdxAndAuthor_UserIdxAndFitDate(Long roomIdx, Long authorUserIdx, LocalDate fitDate);

    @Query(
            """
			select l from FitLog l
			join fetch l.author
			where l.room.roomIdx = :roomIdx and l.fitDate = :fitDate
			""")
    List<FitLog> findAllByRoomIdxAndFitDateWithAuthor(
            @Param("roomIdx") Long roomIdx, @Param("fitDate") LocalDate fitDate);

    @Query(
            """
			select count(l) from FitLog l
			where l.room.roomIdx = :roomIdx
			and l.fitDate = :fitDate
			and exists (
				select m from FitRoomMember m
				where m.room = l.room and m.user = l.author and m.memberStatus = :status
			)
			""")
    long countTodayLogsForActiveMembers(
            @Param("roomIdx") Long roomIdx,
            @Param("fitDate") LocalDate fitDate,
            @Param("status") FitRoomMemberStatus status);

    @Query("select l.imageUrl from FitLog l where l.room.roomIdx = :roomIdx")
    List<String> findImageUrlsByRoomIdx(@Param("roomIdx") Long roomIdx);

    @Modifying
    @Query("delete from FitLog l where l.room.roomIdx = :roomIdx")
    void deleteAllByRoomIdx(@Param("roomIdx") Long roomIdx);

    /** Includes images from rooms the user hosts because those rooms are removed by FK cascade. */
    @Query(
            """
			select distinct l.imageUrl from FitLog l
			where l.author.userIdx = :userIdx or l.room.host.userIdx = :userIdx
			""")
    List<String> findImageUrlsAffectedByUserDeletion(@Param("userIdx") Long userIdx);
}
