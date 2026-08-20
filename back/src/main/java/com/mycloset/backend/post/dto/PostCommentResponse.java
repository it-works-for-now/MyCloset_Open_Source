package com.mycloset.backend.post.dto;

import java.time.LocalDateTime;

import com.mycloset.backend.post.PostComment;

public record PostCommentResponse(Long id, Long commentId, String content, String author, LocalDateTime createdAt) {

    public static PostCommentResponse from(PostComment comment) {
        return new PostCommentResponse(
                comment.getCommentIdx(),
                comment.getCommentIdx(),
                comment.getContent(),
                comment.getUser().getNickname(),
                comment.getCreatedAt());
    }
}
