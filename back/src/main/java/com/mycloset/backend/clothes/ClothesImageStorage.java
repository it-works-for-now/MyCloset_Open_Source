package com.mycloset.backend.clothes;

import org.springframework.web.multipart.MultipartFile;

public interface ClothesImageStorage {

    String store(Long userIdx, MultipartFile image);

    void delete(String imageUrl);
}
