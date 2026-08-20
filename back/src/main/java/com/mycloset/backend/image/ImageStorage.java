package com.mycloset.backend.image;

import org.springframework.web.multipart.MultipartFile;

/**
 * Stores uploaded images outside the database and returns a public URL.
 *
 * <p>The {@code scope} separates the feature that owns the file, for example {@code clothes} or
 * {@code posts}, so one implementation serves every feature with the same size and format rules.
 */
public interface ImageStorage {

    String store(String scope, Long userIdx, MultipartFile image);

    /** Stores server-generated image bytes (for example an AI image generation result). */
    String store(String scope, Long userIdx, byte[] imageBytes, String contentType);

    void delete(String imageUrl);
}
