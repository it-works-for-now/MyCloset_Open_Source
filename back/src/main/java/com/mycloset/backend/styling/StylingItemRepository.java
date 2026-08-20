package com.mycloset.backend.styling;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StylingItemRepository extends JpaRepository<StylingItem, StylingItemId> {

    List<StylingItem> findAllByIdStylingIdxIn(Collection<Long> stylingIdxs);

    List<StylingItem> findAllByIdStylingIdx(Long stylingIdx);

    @Modifying
    @Query("delete from StylingItem item where item.id.stylingIdx = :stylingIdx")
    void deleteAllByStylingIdx(@Param("stylingIdx") Long stylingIdx);
}
