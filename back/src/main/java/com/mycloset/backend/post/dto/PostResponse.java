package com.mycloset.backend.post.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.mycloset.backend.post.Post;

/**
 * The frontend shows the author name and compares it against the signed-in nickname, so the
 * author is exposed as a nickname only. Login ids and emails are never returned on the board.
 */
public record PostResponse(
        Long id,
        Long postId,
        String category,
        String title,
        String content,
        String imageUrl,
        String author,
        int views,
        List<PostCommentResponse> comments,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static PostResponse from(Post post) {
        return new PostResponse(
                post.getPostIdx(),
                post.getPostIdx(),
                post.getCategory().name(),
                post.getTitle(),
                post.getContent(),
                post.getImageUrl(),
                post.getUser().getNickname(),
                post.getViewCount(),
                post.getComments().stream().map(PostCommentResponse::from).toList(),
                post.getCreatedAt(),
                post.getUpdatedAt());
    }
}
