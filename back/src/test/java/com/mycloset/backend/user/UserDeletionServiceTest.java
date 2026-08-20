package com.mycloset.backend.user;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.mycloset.backend.clothes.ClothesRepository;
import com.mycloset.backend.fitlog.FitLogRepository;
import com.mycloset.backend.fitlog.FitRoomMemberRepository;
import com.mycloset.backend.image.ImageStorage;

@ExtendWith(MockitoExtension.class)
class UserDeletionServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ClothesRepository clothesRepository;

    @Mock
    private FitLogRepository fitLogRepository;

    @Mock
    private FitRoomMemberRepository fitRoomMemberRepository;

    @Mock
    private ImageStorage imageStorage;

    private UserDeletionService userDeletionService;
    private UserAccount user;

    @BeforeEach
    void setUp() {
        userDeletionService = new UserDeletionService(
                userRepository, clothesRepository, fitLogRepository, fitRoomMemberRepository, imageStorage);
        user = new UserAccount("closet-user", "encoded-password", "closet", "closet@example.com");
        ReflectionTestUtils.setField(user, "userIdx", 7L);
    }

    @Test
    void deletesTheAccountAndTheUploadedImagesItOwns() {
        when(clothesRepository.findImageUrlsByUserIdx(7L))
                .thenReturn(List.of(
                        "http://localhost:8080/uploads/clothes/7/top.png",
                        "http://localhost:8080/uploads/clothes/7/shoes.png"));
        when(fitLogRepository.findImageUrlsAffectedByUserDeletion(7L))
                .thenReturn(List.of("http://localhost:8080/uploads/fit-logs/7/look.png"));
        when(fitRoomMemberRepository.findProfileImageUrlsAffectedByUserDeletion(7L))
                .thenReturn(List.of("http://localhost:8080/uploads/fit-room-profiles/7/profile.png"));

        userDeletionService.delete(user);

        verify(userRepository).delete(user);
        verify(imageStorage).delete("http://localhost:8080/uploads/clothes/7/top.png");
        verify(imageStorage).delete("http://localhost:8080/uploads/clothes/7/shoes.png");
        verify(imageStorage).delete("http://localhost:8080/uploads/fit-logs/7/look.png");
        verify(imageStorage).delete("http://localhost:8080/uploads/fit-room-profiles/7/profile.png");
    }

    @Test
    void deletesTheAccountWhenItOwnsNoStoredImage() {
        when(clothesRepository.findImageUrlsByUserIdx(7L)).thenReturn(List.of());
        when(fitLogRepository.findImageUrlsAffectedByUserDeletion(7L)).thenReturn(List.of());
        when(fitRoomMemberRepository.findProfileImageUrlsAffectedByUserDeletion(7L))
                .thenReturn(List.of());

        userDeletionService.delete(user);

        verify(userRepository).delete(user);
        verifyNoInteractions(imageStorage);
    }
}
