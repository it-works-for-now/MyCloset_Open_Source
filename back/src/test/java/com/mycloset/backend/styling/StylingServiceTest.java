package com.mycloset.backend.styling;

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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import com.mycloset.backend.clothes.Clothes;
import com.mycloset.backend.clothes.ClothesRepository;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.styling.dto.StylingItemRequest;
import com.mycloset.backend.styling.dto.StylingResponse;
import com.mycloset.backend.styling.dto.StylingSaveRequest;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class StylingServiceTest {

    @Mock
    private StylingRepository stylingRepository;

    @Mock
    private StylingItemRepository stylingItemRepository;

    @Mock
    private ClothesRepository clothesRepository;

    @Mock
    private UserRepository userRepository;

    private StylingService stylingService;
    private UserAccount user;

    @BeforeEach
    void setUp() {
        stylingService =
                new StylingService(stylingRepository, stylingItemRepository, clothesRepository, userRepository);
        user = new UserAccount("closet-user", "encoded-password", "closet", "closet@example.com");
        ReflectionTestUtils.setField(user, "userIdx", 7L);
        when(userRepository.findByLoginId("closet-user")).thenReturn(Optional.of(user));
    }

    @Test
    void createsStylingUsingOnlyTheSelectedClothesIds() {
        Clothes top = clothes(31L, "TOP");
        Clothes shoes = clothes(45L, "SHOES");
        when(clothesRepository.findAllByClothesIdxInAndUser_UserIdx(any(), eq(7L)))
                .thenReturn(List.of(top, shoes));
        when(stylingRepository.save(any(Styling.class))).thenAnswer(invocation -> {
            Styling styling = invocation.getArgument(0);
            ReflectionTestUtils.setField(styling, "stylingIdx", 99L);
            return styling;
        });

        StylingResponse response = stylingService.create(
                "closet-user",
                new StylingSaveRequest(
                        "Campus",
                        "Warm day",
                        Map.of(
                                "top", new StylingItemRequest(31L, null),
                                "shoes", new StylingItemRequest(null, 45L))));

        assertEquals(99L, response.id());
        assertEquals("Campus", response.name());
        assertEquals(31L, response.items().get("top").id());
        assertEquals(45L, response.items().get("shoes").id());
        verify(stylingItemRepository).saveAll(any());
    }

    @Test
    void allowsSavingAStylingWithNoSelectedClothes() {
        when(stylingRepository.save(any(Styling.class))).thenAnswer(invocation -> {
            Styling styling = invocation.getArgument(0);
            ReflectionTestUtils.setField(styling, "stylingIdx", 100L);
            return styling;
        });

        StylingResponse response =
                stylingService.create("closet-user", new StylingSaveRequest("Empty", null, Map.of()));

        assertEquals(100L, response.id());
        assertEquals(Map.of(), response.items());
        verify(clothesRepository, never()).findAllByClothesIdxInAndUser_UserIdx(any(), any());
    }

    @Test
    void rejectsClothesThatDoNotBelongToTheAuthenticatedUser() {
        when(clothesRepository.findAllByClothesIdxInAndUser_UserIdx(any(), eq(7L)))
                .thenReturn(List.of());

        ApiException exception = assertThrows(
                ApiException.class,
                () -> stylingService.create(
                        "closet-user",
                        new StylingSaveRequest("Private", null, Map.of("top", new StylingItemRequest(31L, null)))));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(stylingRepository, never()).save(any());
    }

    @Test
    void rejectsAClothesCategoryThatDoesNotMatchItsSlot() {
        Clothes bottom = clothes(31L, "BOTTOM");
        when(clothesRepository.findAllByClothesIdxInAndUser_UserIdx(any(), eq(7L)))
                .thenReturn(List.of(bottom));

        ApiException exception = assertThrows(
                ApiException.class,
                () -> stylingService.create(
                        "closet-user",
                        new StylingSaveRequest("Mismatch", null, Map.of("top", new StylingItemRequest(31L, null)))));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(stylingRepository, never()).save(any());
    }

    @Test
    void replacesAllStylingItemsWhenUpdating() {
        Styling styling = new Styling(user, "Before", null);
        Clothes top = clothes(31L, "TOP");
        ReflectionTestUtils.setField(styling, "stylingIdx", 99L);
        when(stylingRepository.findByStylingIdxAndUser_UserIdx(99L, 7L)).thenReturn(Optional.of(styling));
        when(clothesRepository.findAllByClothesIdxInAndUser_UserIdx(any(), eq(7L)))
                .thenReturn(List.of(top));

        StylingResponse response = stylingService.update(
                "closet-user",
                99L,
                new StylingSaveRequest("After", "memo", Map.of("top", new StylingItemRequest(31L, null))));

        assertEquals("After", response.name());
        verify(stylingItemRepository).deleteAllByStylingIdx(99L);
        verify(stylingItemRepository).flush();
        verify(stylingItemRepository).saveAll(any());
    }

    private Clothes clothes(Long clothesId, String category) {
        Clothes clothes = org.mockito.Mockito.mock(Clothes.class);
        lenient().when(clothes.getClothesIdx()).thenReturn(clothesId);
        lenient().when(clothes.getAlias()).thenReturn("Item " + clothesId);
        lenient().when(clothes.getCategory()).thenReturn(category);
        lenient().when(clothes.getSubcategory()).thenReturn("DEFAULT");
        lenient().when(clothes.getPattern()).thenReturn(null);
        lenient().when(clothes.getWarmthLevel()).thenReturn(null);
        lenient().when(clothes.getMemo()).thenReturn(null);
        lenient().when(clothes.getImageUrl()).thenReturn("http://images.example.com/" + clothesId + ".jpg");
        lenient().when(clothes.getColors()).thenReturn(new LinkedHashSet<>(List.of("BLUE")));
        lenient().when(clothes.getSeasons()).thenReturn(new LinkedHashSet<>(List.of("SPRING")));
        lenient().when(clothes.getStyleTags()).thenReturn(new LinkedHashSet<>(List.of("CASUAL")));
        return clothes;
    }
}
