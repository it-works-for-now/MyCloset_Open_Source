package com.mycloset.backend.post;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {

    @Query(
            """
			select distinct p from Post p
			join fetch p.user
			left join fetch p.comments c
			left join fetch c.user
			order by p.createdAt desc
			""")
    List<Post> findAllWithCommentsOrderByCreatedAtDesc();

    @Query(
            """
			select p from Post p
			join fetch p.user
			left join fetch p.comments c
			left join fetch c.user
			where p.postIdx = :postIdx
			""")
    Optional<Post> findByIdWithComments(@Param("postIdx") Long postIdx);

    /**
     * Bumps the counter without loading the row, so opening a post never triggers a version
     * conflict or an unintended update of the other columns.
     */
    @Modifying
    @Query("update Post p set p.viewCount = p.viewCount + 1 where p.postIdx = :postIdx")
    int increaseViewCount(@Param("postIdx") Long postIdx);
}
