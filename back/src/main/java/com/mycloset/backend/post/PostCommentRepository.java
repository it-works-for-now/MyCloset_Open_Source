package com.mycloset.backend.post;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    Optional<PostComment> findByCommentIdxAndPost_PostIdx(Long commentIdx, Long postIdx);
}
