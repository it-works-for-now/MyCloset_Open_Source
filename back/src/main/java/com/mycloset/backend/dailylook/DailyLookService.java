package com.mycloset.backend.dailylook;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.clothes.AiServerGateway;
import com.mycloset.backend.clothes.Clothes;
import com.mycloset.backend.clothes.ClothesRepository;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.dailylook.dto.DailyLookImageRequest;
import com.mycloset.backend.dailylook.dto.DailyLookImageResponse;
import com.mycloset.backend.image.ImageStorage;
import com.mycloset.backend.styling.StylingSlot;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;
import com.mycloset.backend.weather.WeatherGateway;
import com.mycloset.backend.weather.WeatherInfo;

@Service
public class DailyLookService {

    private static final String IMAGE_STORAGE_SCOPE = "daily-look";

    private final ClothesRepository clothesRepository;
    private final UserRepository userRepository;
    private final AiServerGateway aiServerGateway;
    private final WeatherGateway weatherGateway;
    private final ImageStorage imageStorage;
    private final ObjectMapper objectMapper;

    public DailyLookService(
            ClothesRepository clothesRepository,
            UserRepository userRepository,
            AiServerGateway aiServerGateway,
            WeatherGateway weatherGateway,
            ImageStorage imageStorage,
            ObjectMapper objectMapper) {
        this.clothesRepository = clothesRepository;
        this.userRepository = userRepository;
        this.aiServerGateway = aiServerGateway;
        this.weatherGateway = weatherGateway;
        this.imageStorage = imageStorage;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public JsonNode recommend(
            String loginId, String situation, boolean considerWeather, Double latitude, Double longitude) {
        UserAccount user = findUser(loginId);
        String modelGender = requireModelGender(user);
        List<Clothes> closet = clothesRepository.findAllByUser_UserIdxOrderByCreatedAtDesc(user.getUserIdx());
        if (closet.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "옷장에 등록된 옷이 없습니다. 먼저 옷을 등록해주세요.");
        }

        AiWeather weather = considerWeather ? fetchWeather(latitude, longitude) : null;
        AiRecommendRequest requestBody = new AiRecommendRequest(
                situation, closet.stream().map(this::toAiClosetItem).toList(), weather, modelGender);
        return aiServerGateway.recommendDailyLook(objectMapper.valueToTree(requestBody));
    }

    private AiWeather fetchWeather(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw badRequest("날씨를 반영하려면 위치 정보가 필요합니다.");
        }
        WeatherInfo weather = weatherGateway.getCurrentWeather(latitude, longitude);
        return new AiWeather(weather.temp(), weather.condition(), weather.tempMin(), weather.tempMax());
    }

    @Transactional(readOnly = true)
    public DailyLookImageResponse generateImage(String loginId, DailyLookImageRequest request) {
        UserAccount user = findUser(loginId);
        String modelGender = requireModelGender(user);
        Map<String, Clothes> selectedClothes = resolveSelectedClothes(user.getUserIdx(), request.items());

        List<AiImageItem> items = selectedClothes.entrySet().stream()
                .map(entry -> toAiImageItem(entry.getKey(), entry.getValue()))
                .toList();
        List<String> styleKeywords = request.styleKeywords() == null ? List.of() : request.styleKeywords();

        byte[] imageBytes = aiServerGateway.generateDailyLookImage(
                objectMapper.valueToTree(new AiImageRequest(items, styleKeywords, modelGender)));
        String imageUrl = imageStorage.store(IMAGE_STORAGE_SCOPE, user.getUserIdx(), imageBytes, "image/png");
        return new DailyLookImageResponse(imageUrl);
    }

    private Map<String, Clothes> resolveSelectedClothes(Long userIdx, Map<String, Long> requestedItems) {
        Map<String, Long> clothesIdBySlot = new LinkedHashMap<>();
        Set<Long> clothesIds = new LinkedHashSet<>();

        for (Map.Entry<String, Long> entry : requestedItems.entrySet()) {
            StylingSlot slot = StylingSlot.fromKey(entry.getKey());
            if (slot == null) {
                throw badRequest("코디 슬롯 키가 올바르지 않습니다.");
            }
            if (entry.getValue() == null) {
                continue;
            }
            clothesIdBySlot.put(slot.getKey(), entry.getValue());
            clothesIds.add(entry.getValue());
        }

        if (clothesIdBySlot.isEmpty()) {
            throw badRequest("이미지를 생성할 옷을 하나 이상 선택해주세요.");
        }

        List<Clothes> foundClothes = clothesRepository.findAllByClothesIdxInAndUser_UserIdx(clothesIds, userIdx);
        Map<Long, Clothes> clothesById = new LinkedHashMap<>();
        foundClothes.forEach(clothes -> clothesById.put(clothes.getClothesIdx(), clothes));
        if (clothesById.size() != clothesIds.size()) {
            throw badRequest("내 옷장에 없는 옷은 코디에 넣을 수 없습니다.");
        }

        Map<String, Clothes> selectedClothes = new LinkedHashMap<>();
        for (Map.Entry<String, Long> entry : clothesIdBySlot.entrySet()) {
            StylingSlot slot = StylingSlot.fromKey(entry.getKey());
            Clothes clothes = clothesById.get(entry.getValue());
            if (!slot.supportsCategory(clothes.getCategory())) {
                throw badRequest("선택한 옷의 카테고리가 코디 슬롯과 맞지 않습니다.");
            }
            selectedClothes.put(entry.getKey(), clothes);
        }
        return selectedClothes;
    }

    private AiClosetItem toAiClosetItem(Clothes clothes) {
        return new AiClosetItem(
                clothes.getClothesIdx(),
                clothes.getCategory(),
                clothes.getSubcategory(),
                List.copyOf(clothes.getColors()),
                clothes.getPattern(),
                List.copyOf(clothes.getSeasons()),
                List.copyOf(clothes.getStyleTags()),
                clothes.getWarmthLevel());
    }

    private AiImageItem toAiImageItem(String slotKey, Clothes clothes) {
        return new AiImageItem(
                slotKey,
                clothes.getCategory(),
                clothes.getSubcategory(),
                List.copyOf(clothes.getColors()),
                clothes.getImageUrl());
    }

    private UserAccount findUser(String loginId) {
        return userRepository
                .findByLoginId(loginId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    private String requireModelGender(UserAccount user) {
        String modelGender = user.getModelGender();
        if (!"male".equals(modelGender) && !"female".equals(modelGender)) {
            throw badRequest("AI 모델 성별을 마이페이지에서 설정해주세요.");
        }
        return modelGender;
    }

    private ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    private record AiClosetItem(
            Long clothesId,
            String category,
            String subcategory,
            List<String> colors,
            String pattern,
            List<String> seasons,
            List<String> styleTags,
            Integer warmthLevel) {}

    private record AiRecommendRequest(
            String situation, List<AiClosetItem> closet, AiWeather weather, String modelGender) {}

    private record AiWeather(double temp, String condition, double tempMin, double tempMax) {}

    private record AiImageItem(
            String slot, String category, String subcategory, List<String> colors, String imageUrl) {}

    private record AiImageRequest(List<AiImageItem> items, List<String> styleKeywords, String modelGender) {}
}
