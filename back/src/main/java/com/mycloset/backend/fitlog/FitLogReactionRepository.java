package com.mycloset.backend.fitlog;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FitLogReactionRepository extends JpaRepository<FitLogReaction, Long> {

    Optional<FitLogReaction> findByFitLog_FitLogIdxAndUser_UserIdxAndEmoji(Long fitLogIdx, Long userIdx, String emoji);

    @Query(
            """
			select r from FitLogReaction r
			join fetch r.fitLog l
			join fetch r.user
			where l.room.roomIdx = :roomIdx and l.fitDate = :fitDate
			order by r.createdAt asc
			""")
    List<FitLogReaction> findAllByRoomIdxAndFitDate(
            @Param("roomIdx") Long roomIdx, @Param("fitDate") LocalDate fitDate);

    @Modifying
    @Query(
            """
			delete from FitLogReaction r
			where r.fitLog in (select l from FitLog l where l.room.roomIdx = :roomIdx)
			""")
    void deleteAllByRoomIdx(@Param("roomIdx") Long roomIdx);
}
