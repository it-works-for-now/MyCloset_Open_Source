package com.mycloset.backend.clothes;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClothesRepository extends JpaRepository<Clothes, Long> {

    List<Clothes> findAllByUser_UserIdxOrderByCreatedAtDesc(Long userIdx);

    Optional<Clothes> findByClothesIdxAndUser_UserIdx(Long clothesIdx, Long userIdx);

    List<Clothes> findAllByClothesIdxInAndUser_UserIdx(Collection<Long> clothesIdxs, Long userIdx);

    /**
     * Reads only the stored image paths so that account deletion never loads Clothes entities.
     * Managed entities would still reference the account being removed and fail on flush.
     */
    @Query("select c.imageUrl from Clothes c where c.user.userIdx = :userIdx and c.imageUrl is not null")
    List<String> findImageUrlsByUserIdx(@Param("userIdx") Long userIdx);
}
