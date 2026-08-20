package com.mycloset.backend.image;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.mycloset.backend.clothes.LocalImageStorageProperties;
import com.mycloset.backend.common.ApiException;

@Service
public class LocalImageStorage implements ImageStorage {

    private static final long MAX_IMAGE_SIZE_BYTES = 15L * 1024 * 1024;
    private static final String PUBLIC_PATH = "/uploads/";
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif");

    private final Path storageDirectory;
    private final String publicUrlPrefix;

    public LocalImageStorage(LocalImageStorageProperties properties) {
        storageDirectory = Path.of(properties.getDirectory()).toAbsolutePath().normalize();
        publicUrlPrefix = removeTrailingSlash(properties.getPublicBaseUrl()) + PUBLIC_PATH;
        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("로컬 이미지 저장소 디렉토리를 만들 수 없습니다.", exception);
        }
    }

    @Override
    public String store(String scope, Long userIdx, MultipartFile image) {
        String extension = validateAndGetExtension(image);
        String relativePath = scope + "/" + userIdx + "/" + UUID.randomUUID() + extension;
        Path target = resolve(relativePath);

        try {
            Files.createDirectories(target.getParent());
            try (InputStream inputStream = image.getInputStream()) {
                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 파일을 저장하지 못했습니다.");
        }

        return publicUrlPrefix + relativePath;
    }

    @Override
    public String store(String scope, Long userIdx, byte[] imageBytes, String contentType) {
        String extension = EXTENSIONS.getOrDefault(contentType, ".png");
        String relativePath = scope + "/" + userIdx + "/" + UUID.randomUUID() + extension;
        Path target = resolve(relativePath);

        try {
            Files.createDirectories(target.getParent());
            Files.write(target, imageBytes);
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 파일을 저장하지 못했습니다.");
        }

        return publicUrlPrefix + relativePath;
    }

    @Override
    public void delete(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith(publicUrlPrefix)) {
            return;
        }

        String relativePath = imageUrl.substring(publicUrlPrefix.length());
        try {
            Files.deleteIfExists(resolve(relativePath));
        } catch (IOException ignored) {
            // A file cleanup failure must not roll back a completed database change.
        }
    }

    private String validateAndGetExtension(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 파일을 선택해주세요.");
        }
        if (image.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "이미지 파일 크기가 15MB를 초과했습니다.");
        }

        String extension = EXTENSIONS.get(image.getContentType());
        if (extension == null) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "JPEG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.");
        }
        return extension;
    }

    private Path resolve(String relativePath) {
        Path target = storageDirectory.resolve(relativePath).normalize();
        if (!target.startsWith(storageDirectory)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 경로가 올바르지 않습니다.");
        }
        return target;
    }

    private String removeTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
