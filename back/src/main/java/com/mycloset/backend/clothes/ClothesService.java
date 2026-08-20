package com.mycloset.backend.clothes;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.mycloset.backend.clothes.dto.ClothesImageUploadResponse;
import com.mycloset.backend.clothes.dto.ClothesResponse;
import com.mycloset.backend.clothes.dto.ClothesSaveRequest;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;

@Service
public class ClothesService {

    private final ClothesRepository clothesRepository;
    private final UserRepository userRepository;
    private final ClothesImageStorage clothesImageStorage;

    public ClothesService(
            ClothesRepository clothesRepository,
            UserRepository userRepository,
            ClothesImageStorage clothesImageStorage) {
        this.clothesRepository = clothesRepository;
        this.userRepository = userRepository;
        this.clothesImageStorage = clothesImageStorage;
    }

    @Transactional(readOnly = true)
    public List<ClothesResponse> findMyClothes(String loginId) {
        UserAccount user = findUser(loginId);
        return clothesRepository.findAllByUser_UserIdxOrderByCreatedAtDesc(user.getUserIdx()).stream()
                .map(ClothesResponse::from)
                .toList();
    }

    @Transactional
    public ClothesResponse create(String loginId, ClothesSaveRequest request) {
        UserAccount user = findUser(loginId);
        Clothes clothes = new Clothes(user, toValues(request));
        return ClothesResponse.from(clothesRepository.save(clothes));
    }

    @Transactional
    public ClothesImageUploadResponse uploadImage(String loginId, MultipartFile image) {
        UserAccount user = findUser(loginId);
        return new ClothesImageUploadResponse(clothesImageStorage.store(user.getUserIdx(), image));
    }

    @Transactional
    public ClothesResponse update(String loginId, Long clothesId, ClothesSaveRequest request) {
        UserAccount user = findUser(loginId);
        Clothes clothes = findMyClothes(clothesId, user.getUserIdx());
        String previousImageUrl = clothes.getImageUrl();
        clothes.update(toValues(request));
        if (!Objects.equals(previousImageUrl, clothes.getImageUrl())) {
            deleteImageAfterCommit(previousImageUrl);
        }
        return ClothesResponse.from(clothes);
    }

    @Transactional
    public void delete(String loginId, Long clothesId) {
        UserAccount user = findUser(loginId);
        Clothes clothes = findMyClothes(clothesId, user.getUserIdx());
        clothesRepository.delete(clothes);
        deleteImageAfterCommit(clothes.getImageUrl());
    }

    private UserAccount findUser(String loginId) {
        return userRepository
                .findByLoginId(loginId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    private Clothes findMyClothes(Long clothesId, Long userIdx) {
        return clothesRepository
                .findByClothesIdxAndUser_UserIdx(clothesId, userIdx)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "옷 정보를 찾을 수 없습니다."));
    }

    private ClothesValues toValues(ClothesSaveRequest request) {
        return new ClothesValues(
                trimToNull(request.alias()),
                request.category().trim(),
                request.subcategory().trim(),
                trimToNull(request.pattern()),
                request.warmthLevel(),
                trimToNull(request.memo()),
                normalizeImageUrl(request.imageUrl()),
                normalizeValues(request.colors()),
                normalizeValues(request.seasons()),
                normalizeValues(request.styleTags()));
    }

    private LinkedHashSet<String> normalizeValues(List<String> values) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            normalized.add(value.trim());
        }
        return normalized;
    }

    private String normalizeImageUrl(String imageUrl) {
        String value = trimToNull(imageUrl);
        if (value == null) {
            return null;
        }
        if (value.regionMatches(true, 0, "data:", 0, 5)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 Data URL은 저장할 수 없습니다.");
        }

        try {
            URI uri = new URI(value);
            if (uri.getHost() == null
                    || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 URL 형식이 올바르지 않습니다.");
            }
            return value;
        } catch (URISyntaxException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 URL 형식이 올바르지 않습니다.");
        }
    }

    private void deleteImageAfterCommit(String imageUrl) {
        if (imageUrl == null) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            clothesImageStorage.delete(imageUrl);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                clothesImageStorage.delete(imageUrl);
            }
        });
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
