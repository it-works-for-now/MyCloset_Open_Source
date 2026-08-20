package com.mycloset.backend.fitlog;

import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FitRoomRepository extends JpaRepository<FitRoom, Long> {

    Optional<FitRoom> findByRoomCode(String roomCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from FitRoom r where r.roomCode = :roomCode")
    Optional<FitRoom> findByRoomCodeForUpdate(@Param("roomCode") String roomCode);

    boolean existsByRoomCode(String roomCode);
}
