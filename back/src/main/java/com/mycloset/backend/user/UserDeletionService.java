package com.mycloset.backend.user;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.mycloset.backend.clothes.ClothesRepository;
import com.mycloset.backend.fitlog.FitLogRepository;
import com.mycloset.backend.fitlog.FitRoomMemberRepository;
import com.mycloset.backend.image.ImageStorage;

/**
 * Removes an account and the files that the database cannot clean up on its own.
 *
 * <p>The schema declares ON DELETE CASCADE from users to clothes and stylings, so deleting the
 * account row also removes related clothes, stylings and FitLog records. Uploaded image files live
 * on disk, so their paths are collected before the delete and removed once the transaction commits.
 */
@Service
public class UserDeletionService {

    private final UserRepository userRepository;
    private final ClothesRepository clothesRepository;
    private final FitLogRepository fitLogRepository;
    private final FitRoomMemberRepository fitRoomMemberRepository;
    private final ImageStorage imageStorage;

    public UserDeletionService(
            UserRepository userRepository,
            ClothesRepository clothesRepository,
            FitLogRepository fitLogRepository,
            FitRoomMemberRepository fitRoomMemberRepository,
            ImageStorage imageStorage) {
        this.userRepository = userRepository;
        this.clothesRepository = clothesRepository;
        this.fitLogRepository = fitLogRepository;
        this.fitRoomMemberRepository = fitRoomMemberRepository;
        this.imageStorage = imageStorage;
    }

    @Transactional
    public void delete(UserAccount user) {
        LinkedHashSet<String> imageUrls =
                new LinkedHashSet<>(clothesRepository.findImageUrlsByUserIdx(user.getUserIdx()));
        imageUrls.addAll(fitLogRepository.findImageUrlsAffectedByUserDeletion(user.getUserIdx()));
        imageUrls.addAll(fitRoomMemberRepository.findProfileImageUrlsAffectedByUserDeletion(user.getUserIdx()));

        userRepository.delete(user);
        deleteImagesAfterCommit(new ArrayList<>(imageUrls));
    }

    private void deleteImagesAfterCommit(List<String> imageUrls) {
        if (imageUrls.isEmpty()) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            imageUrls.forEach(imageStorage::delete);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                imageUrls.forEach(imageStorage::delete);
            }
        });
    }
}
