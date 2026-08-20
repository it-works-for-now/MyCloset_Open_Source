package com.mycloset.backend.post;

import org.springframework.http.HttpStatus;

import com.mycloset.backend.common.ApiException;

/** Board categories shown as tabs on the frontend. {@code ALL} is a filter only, never stored. */
public enum PostCategory {
    COORDINATION,
    QUESTION,
    REVIEW,
    FREE;

    public static PostCategory from(String value) {
        if (value == null || value.isBlank()) {
            return FREE;
        }
        try {
            return valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "지원하지 않는 게시글 분류입니다.");
        }
    }
}
