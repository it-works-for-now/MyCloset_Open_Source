package com.mycloset.backend.styling;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StylingRepository extends JpaRepository<Styling, Long> {

    List<Styling> findAllByUser_UserIdxOrderByUpdatedAtDesc(Long userIdx);

    Optional<Styling> findByStylingIdxAndUser_UserIdx(Long stylingIdx, Long userIdx);
}
