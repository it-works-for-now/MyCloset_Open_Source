package com.mycloset.backend.clothes;

import java.io.IOException;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.mycloset.backend.common.ApiException;

@Service
public class GarmentAnalysisService {

    private static final long MAX_IMAGE_SIZE_BYTES = 15L * 1024 * 1024;

    private final AiServerGateway aiServerGateway;

    public GarmentAnalysisService(AiServerGateway aiServerGateway) {
        this.aiServerGateway = aiServerGateway;
    }

    public JsonNode analyze(MultipartFile image) {
        validateImage(image);

        try {
            return aiServerGateway.analyze(
                    image.getBytes(), normalizeFilename(image.getOriginalFilename()), image.getContentType());
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 파일을 읽을 수 없습니다.");
        }
    }

    private void validateImage(MultipartFile image) {
        if (image == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "image 파일을 입력해주세요.");
        }
        if (image.isEmpty() || image.getSize() == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "빈 이미지 파일은 분석할 수 없습니다.");
        }
        if (!isImageContentType(image.getContentType())) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "이미지 파일만 분석할 수 있습니다.");
        }
        if (image.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "이미지 파일 크기가 15MB를 초과했습니다.");
        }
    }

    private boolean isImageContentType(String contentType) {
        return contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("image/");
    }

    private String normalizeFilename(String filename) {
        return filename == null ? "" : filename;
    }
}
