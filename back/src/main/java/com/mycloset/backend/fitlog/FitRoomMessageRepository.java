package com.mycloset.backend.fitlog;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FitRoomMessageRepository extends JpaRepository<FitRoomMessage, Long> {

    @Query(
            """
			select m from FitRoomMessage m
			join fetch m.sender
			left join fetch m.quotedFitLog q
			left join fetch q.author
			where m.room.roomIdx = :roomIdx
			order by m.createdAt asc
			""")
    List<FitRoomMessage> findAllByRoomIdxWithDetails(@Param("roomIdx") Long roomIdx);

    Optional<FitRoomMessage> findTopByRoom_RoomIdxOrderByCreatedAtDesc(Long roomIdx);

    @Modifying
    @Query("delete from FitRoomMessage m where m.room.roomIdx = :roomIdx")
    void deleteAllByRoomIdx(@Param("roomIdx") Long roomIdx);
}
