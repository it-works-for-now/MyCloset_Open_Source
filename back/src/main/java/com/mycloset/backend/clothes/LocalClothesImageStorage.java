package com.mycloset.backend.clothes;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.mycloset.backend.image.ImageStorage;

/** Keeps clothes images under their own scope while sharing the common storage rules. */
@Service
public class LocalClothesImageStorage implements ClothesImageStorage {

    private static final String SCOPE = "clothes";

    private final ImageStorage imageStorage;

    public LocalClothesImageStorage(ImageStorage imageStorage) {
        this.imageStorage = imageStorage;
    }

    @Override
    public String store(Long userIdx, MultipartFile image) {
        return imageStorage.store(SCOPE, userIdx, image);
    }

    @Override
    public void delete(String imageUrl) {
        imageStorage.delete(imageUrl);
    }
}
