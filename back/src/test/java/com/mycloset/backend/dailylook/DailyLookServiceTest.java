package com.mycloset.backend.dailylook;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.clothes.AiServerGateway;
import com.mycloset.backend.clothes.Clothes;
import com.mycloset.backend.clothes.ClothesRepository;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.dailylook.dto.DailyLookImageRequest;
import com.mycloset.backend.dailylook.dto.DailyLookImageResponse;
import com.mycloset.backend.image.ImageStorage;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;
import com.mycloset.backend.weather.WeatherGateway;

@ExtendWith(MockitoExtension.class)
class DailyLookServiceTest {

    @Mock
    private ClothesRepository clothesRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AiServerGateway aiServerGateway;

    @Mock
    private WeatherGateway weatherGateway;

    @Mock
    private ImageStorage imageStorage;

    private DailyLookService dailyLookService;
    private UserAccount user;

    @BeforeEach
    void setUp() {
        dailyLookService = new DailyLookService(
                clothesRepository, userRepository, aiServerGateway, weatherGateway, imageStorage, new ObjectMapper());

        user = new UserAccount("closet-user", "encoded-password", "closet", "closet@example.com", "female");
        ReflectionTestUtils.setField(user, "userIdx", 7L);
        when(userRepository.findByLoginId("closet-user")).thenReturn(Optional.of(user));
    }

    @Test
    void generatesImageWithTheSelectedClothesStoredImageUrl() {
        Clothes top = clothes(31L, "TOP", "http://192.168.0.10:8080/uploads/clothes/7/top.jpg");
        byte[] generatedImage = {1, 2, 3};
        when(clothesRepository.findAllByClothesIdxInAndUser_UserIdx(any(), eq(7L)))
                .thenReturn(List.of(top));
        when(aiServerGateway.generateDailyLookImage(any(JsonNode.class))).thenReturn(generatedImage);
        when(imageStorage.store(eq("daily-look"), eq(7L), any(byte[].class), eq("image/png")))
                .thenReturn("http://192.168.0.10:8080/uploads/daily-look/7/result.png");

        DailyLookImageResponse response = dailyLookService.generateImage(
                "closet-user", new DailyLookImageRequest(Map.of("top", 31L), List.of("minimal", "casual")));

        ArgumentCaptor<JsonNode> requestCaptor = ArgumentCaptor.forClass(JsonNode.class);
        verify(aiServerGateway).generateDailyLookImage(requestCaptor.capture());
        JsonNode requestBody = requestCaptor.getValue();
        JsonNode item = requestBody.path("items").get(0);
        assertEquals("top", item.path("slot").asText());
        assertEquals("TOP", item.path("category").asText());
        assertEquals(
                "http://192.168.0.10:8080/uploads/clothes/7/top.jpg",
                item.path("imageUrl").asText());
        assertEquals("female", requestBody.path("modelGender").asText());
        assertEquals("minimal", requestBody.path("styleKeywords").get(0).asText());
        assertEquals("casual", requestBody.path("styleKeywords").get(1).asText());
        assertEquals("http://192.168.0.10:8080/uploads/daily-look/7/result.png", response.imageUrl());
    }

    @Test
    void rejectsAnotherUsersClothesBeforeCallingTheAiGateway() {
        when(clothesRepository.findAllByClothesIdxInAndUser_UserIdx(any(), eq(7L)))
                .thenReturn(List.of());

        ApiException exception = assertThrows(
                ApiException.class,
                () -> dailyLookService.generateImage(
                        "closet-user", new DailyLookImageRequest(Map.of("top", 99L), List.of())));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(aiServerGateway, never()).generateDailyLookImage(any());
        verify(imageStorage, never()).store(eq("daily-look"), eq(7L), any(byte[].class), eq("image/png"));
    }

    @Test
    void includesTheStoredModelGenderInTheRecommendationRequest() {
        ReflectionTestUtils.setField(user, "modelGender", "male");
        Clothes top = clothes(31L, "TOP", "http://192.168.0.10:8080/uploads/clothes/7/top.jpg");
        when(clothesRepository.findAllByUser_UserIdxOrderByCreatedAtDesc(7L)).thenReturn(List.of(top));
        when(aiServerGateway.recommendDailyLook(any(JsonNode.class))).thenReturn(new ObjectMapper().createObjectNode());

        dailyLookService.recommend("closet-user", "campus", false, null, null);

        ArgumentCaptor<JsonNode> requestCaptor = ArgumentCaptor.forClass(JsonNode.class);
        verify(aiServerGateway).recommendDailyLook(requestCaptor.capture());
        assertEquals("male", requestCaptor.getValue().path("modelGender").asText());
    }

    @Test
    void rejectsDailyLookRequestsBeforeCallingTheAiGatewayWhenModelGenderIsMissing() {
        ReflectionTestUtils.setField(user, "modelGender", null);

        ApiException recommendException = assertThrows(
                ApiException.class, () -> dailyLookService.recommend("closet-user", "campus", false, null, null));
        ApiException imageException = assertThrows(
                ApiException.class,
                () -> dailyLookService.generateImage(
                        "closet-user", new DailyLookImageRequest(Map.of("top", 31L), List.of())));

        assertEquals(HttpStatus.BAD_REQUEST, recommendException.getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, imageException.getStatus());
        verify(aiServerGateway, never()).recommendDailyLook(any());
        verify(aiServerGateway, never()).generateDailyLookImage(any());
    }

    private Clothes clothes(Long clothesId, String category, String imageUrl) {
        Clothes clothes = org.mockito.Mockito.mock(Clothes.class);
        lenient().when(clothes.getClothesIdx()).thenReturn(clothesId);
        lenient().when(clothes.getCategory()).thenReturn(category);
        lenient().when(clothes.getSubcategory()).thenReturn("DEFAULT");
        lenient().when(clothes.getColors()).thenReturn(new LinkedHashSet<>(List.of("WHITE")));
        lenient().when(clothes.getPattern()).thenReturn("SOLID");
        lenient().when(clothes.getSeasons()).thenReturn(new LinkedHashSet<>(List.of("SUMMER")));
        lenient().when(clothes.getStyleTags()).thenReturn(new LinkedHashSet<>(List.of("CASUAL")));
        lenient().when(clothes.getWarmthLevel()).thenReturn(2);
        lenient().when(clothes.getImageUrl()).thenReturn(imageUrl);
        return clothes;
    }
}
