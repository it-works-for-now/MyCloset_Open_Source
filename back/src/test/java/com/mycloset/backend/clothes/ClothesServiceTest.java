package com.mycloset.backend.clothes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import com.mycloset.backend.clothes.dto.ClothesResponse;
import com.mycloset.backend.clothes.dto.ClothesSaveRequest;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class ClothesServiceTest {

    @Mock
    private ClothesRepository clothesRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ClothesImageStorage clothesImageStorage;

    private ClothesService clothesService;
    private UserAccount user;

    @BeforeEach
    void setUp() {
        clothesService = new ClothesService(clothesRepository, userRepository, clothesImageStorage);
        user = new UserAccount("closet-user", "encoded-password", "closet", "closet@example.com");
        ReflectionTestUtils.setField(user, "userIdx", 7L);
        when(userRepository.findByLoginId("closet-user")).thenReturn(Optional.of(user));
    }

    @Test
    void createsClothesUsingTheFrontendFieldNames() {
        when(clothesRepository.save(any(Clothes.class))).thenAnswer(invocation -> {
            Clothes clothes = invocation.getArgument(0);
            ReflectionTestUtils.setField(clothes, "clothesIdx", 31L);
            return clothes;
        });

        ClothesResponse response = clothesService.create(
                "closet-user",
                request("출근용 네이비 셔츠", List.of("NAVY", "NAVY"), "https://images.example.com/navy-shirt.jpg"));

        assertEquals(31L, response.id());
        assertEquals("출근용 네이비 셔츠", response.alias());
        assertEquals("TOP", response.category());
        assertEquals("SHIRT", response.subcategory());
        assertEquals(List.of("NAVY"), response.colors());
        assertEquals(List.of("SPRING", "FALL"), response.seasons());
        assertEquals(List.of("CASUAL"), response.styleTags());
        assertEquals(3, response.warmthLevel());
        assertEquals("https://images.example.com/navy-shirt.jpg", response.imageUrl());
    }

    @Test
    void acceptsNoImageUrlUntilImageStorageIsImplemented() {
        when(clothesRepository.save(any(Clothes.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ClothesResponse response = clothesService.create("closet-user", request("", List.of("BLUE"), null));

        assertNull(response.imageUrl());
    }

    @Test
    void rejectsDataUrlInsteadOfSavingImageBytesToTheDatabase() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> clothesService.create("closet-user", request("", List.of("BLUE"), "data:image/png;base64,AAAA")));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(clothesRepository, never()).save(any());
    }

    @Test
    void updatesOnlyClothesOwnedByTheAuthenticatedUser() {
        Clothes clothes = new Clothes(
                user,
                new ClothesValues(
                        "기존 이름",
                        "TOP",
                        "SHIRT",
                        "SOLID",
                        2,
                        "기존 메모",
                        null,
                        new java.util.LinkedHashSet<>(List.of("BLUE")),
                        new java.util.LinkedHashSet<>(List.of("SPRING")),
                        new java.util.LinkedHashSet<>(List.of("CASUAL"))));
        ReflectionTestUtils.setField(clothes, "clothesIdx", 31L);
        when(clothesRepository.findByClothesIdxAndUser_UserIdx(31L, 7L)).thenReturn(Optional.of(clothes));

        ClothesResponse response = clothesService.update("closet-user", 31L, request("수정된 이름", List.of("NAVY"), null));

        assertEquals("수정된 이름", response.alias());
        assertEquals(List.of("NAVY"), response.colors());
        assertNull(response.imageUrl());
    }

    @Test
    void uploadsImagesUnderTheAuthenticatedUsersDirectory() {
        when(clothesImageStorage.store(eq(7L), any())).thenReturn("http://localhost:8080/uploads/clothes/7/shirt.jpg");

        var response = clothesService.uploadImage(
                "closet-user", new MockMultipartFile("image", "shirt.jpg", "image/jpeg", new byte[] {1}));

        assertEquals("http://localhost:8080/uploads/clothes/7/shirt.jpg", response.imageUrl());
        verify(clothesImageStorage).store(eq(7L), any());
    }

    @Test
    void deletingClothesDeletesItsLocallyStoredImageAfterTheDatabaseDelete() {
        Clothes clothes = new Clothes(
                user,
                new ClothesValues(
                        "기존 이름",
                        "TOP",
                        "SHIRT",
                        "SOLID",
                        2,
                        "메모",
                        "http://localhost:8080/uploads/clothes/7/shirt.jpg",
                        new java.util.LinkedHashSet<>(List.of("BLUE")),
                        new java.util.LinkedHashSet<>(List.of("SPRING")),
                        new java.util.LinkedHashSet<>(List.of("CASUAL"))));
        ReflectionTestUtils.setField(clothes, "clothesIdx", 31L);
        when(clothesRepository.findByClothesIdxAndUser_UserIdx(31L, 7L)).thenReturn(Optional.of(clothes));

        clothesService.delete("closet-user", 31L);

        verify(clothesRepository).delete(clothes);
        verify(clothesImageStorage).delete("http://localhost:8080/uploads/clothes/7/shirt.jpg");
    }

    private ClothesSaveRequest request(String alias, List<String> colors, String imageUrl) {
        return new ClothesSaveRequest(
                alias,
                "TOP",
                "SHIRT",
                "SOLID",
                colors,
                List.of("SPRING", "FALL"),
                List.of("CASUAL"),
                3,
                "메모",
                imageUrl);
    }
}
