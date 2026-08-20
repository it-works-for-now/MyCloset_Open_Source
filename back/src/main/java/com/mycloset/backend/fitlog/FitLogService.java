package com.mycloset.backend.fitlog;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.fitlog.dto.FitImageUploadResponse;
import com.mycloset.backend.fitlog.dto.FitLogCaptionUpdateRequest;
import com.mycloset.backend.fitlog.dto.FitLogQuoteResponse;
import com.mycloset.backend.fitlog.dto.FitLogReactionRequest;
import com.mycloset.backend.fitlog.dto.FitLogReactionResponse;
import com.mycloset.backend.fitlog.dto.FitLogSaveRequest;
import com.mycloset.backend.fitlog.dto.FitLogSummaryResponse;
import com.mycloset.backend.fitlog.dto.FitRoomCreateRequest;
import com.mycloset.backend.fitlog.dto.FitRoomJoinRequest;
import com.mycloset.backend.fitlog.dto.FitRoomMemberResponse;
import com.mycloset.backend.fitlog.dto.FitRoomMessageRequest;
import com.mycloset.backend.fitlog.dto.FitRoomMessageResponse;
import com.mycloset.backend.fitlog.dto.FitRoomProfileUpdateRequest;
import com.mycloset.backend.fitlog.dto.FitRoomResponse;
import com.mycloset.backend.fitlog.dto.FitRoomStateResponse;
import com.mycloset.backend.fitlog.dto.FitRoomUpdateRequest;
import com.mycloset.backend.image.ImageStorage;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;

@Service
public class FitLogService {

    private static final String FIT_LOG_IMAGE_SCOPE = "fit-logs";
    private static final String FIT_ROOM_PROFILE_IMAGE_SCOPE = "fit-room-profiles";
    private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final String DEFAULT_ROOM_STATUS = "new chat";

    private final FitRoomRepository fitRoomRepository;
    private final FitRoomMemberRepository fitRoomMemberRepository;
    private final FitLogRepository fitLogRepository;
    private final FitLogReactionRepository fitLogReactionRepository;
    private final FitRoomMessageRepository fitRoomMessageRepository;
    private final UserRepository userRepository;
    private final ImageStorage imageStorage;

    public FitLogService(
            FitRoomRepository fitRoomRepository,
            FitRoomMemberRepository fitRoomMemberRepository,
            FitLogRepository fitLogRepository,
            FitLogReactionRepository fitLogReactionRepository,
            FitRoomMessageRepository fitRoomMessageRepository,
            UserRepository userRepository,
            ImageStorage imageStorage) {
        this.fitRoomRepository = fitRoomRepository;
        this.fitRoomMemberRepository = fitRoomMemberRepository;
        this.fitLogRepository = fitLogRepository;
        this.fitLogReactionRepository = fitLogReactionRepository;
        this.fitRoomMessageRepository = fitRoomMessageRepository;
        this.userRepository = userRepository;
        this.imageStorage = imageStorage;
    }

    @Transactional(readOnly = true)
    public List<FitRoomResponse> findMyRooms(String loginId) {
        UserAccount user = findUser(loginId);
        return fitRoomMemberRepository.findAllByUserIdxAndStatus(user.getUserIdx(), FitRoomMemberStatus.ACTIVE).stream()
                .map(this::toRoomResponse)
                .toList();
    }

    @Transactional
    public FitRoomResponse createRoom(String loginId, FitRoomCreateRequest request) {
        UserAccount host = findUser(loginId);
        FitRoom room = fitRoomRepository.save(
                new FitRoom(generateRoomCode(), request.name().trim(), request.memberLimit(), host));
        FitRoomMember membership = fitRoomMemberRepository.save(new FitRoomMember(room, host, FitRoomMemberRole.HOST));
        return toRoomResponse(membership);
    }

    @Transactional(readOnly = true)
    public FitRoomResponse previewRoom(String roomCode) {
        FitRoom room = findRoom(roomCode);
        return toRoomResponse(room, FitRoomMemberRole.MEMBER, false);
    }

    @Transactional
    public FitRoomResponse joinRoom(String loginId, FitRoomJoinRequest request) {
        UserAccount user = findUser(loginId);
        FitRoom room = fitRoomRepository
                .findByRoomCodeForUpdate(request.code().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FitLog room was not found."));
        Optional<FitRoomMember> existing =
                fitRoomMemberRepository.findByRoom_RoomIdxAndUser_UserIdx(room.getRoomIdx(), user.getUserIdx());

        if (existing.isPresent() && existing.get().getMemberStatus() == FitRoomMemberStatus.ACTIVE) {
            return toRoomResponse(existing.get());
        }

        long activeMembers = fitRoomMemberRepository.countByRoom_RoomIdxAndMemberStatus(
                room.getRoomIdx(), FitRoomMemberStatus.ACTIVE);
        if (activeMembers >= room.getMemberLimit()) {
            throw new ApiException(HttpStatus.CONFLICT, "The FitLog room is full.");
        }

        FitRoomMember membership;
        if (existing.isPresent()) {
            membership = existing.get();
            membership.rejoin();
        } else {
            membership = fitRoomMemberRepository.save(new FitRoomMember(room, user, FitRoomMemberRole.MEMBER));
        }
        return toRoomResponse(membership);
    }

    @Transactional(readOnly = true)
    public FitRoomStateResponse getRoomState(String loginId, String roomCode) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        return toRoomState(membership.getRoom(), user, membership);
    }

    @Transactional
    public FitRoomResponse updateRoom(String loginId, String roomCode, FitRoomUpdateRequest request) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        requireHost(membership.getRoom(), user.getUserIdx());
        membership.getRoom().rename(request.name().trim());
        return toRoomResponse(membership);
    }

    @Transactional
    public void leaveRoom(String loginId, String roomCode) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        if (membership.getRoom().isHostedBy(user.getUserIdx())) {
            deleteRoom(membership.getRoom());
            return;
        }
        membership.leave();
    }

    @Transactional
    public void deleteRoom(String loginId, String roomCode) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        requireHost(membership.getRoom(), user.getUserIdx());
        deleteRoom(membership.getRoom());
    }

    @Transactional
    public FitRoomStateResponse updateMyProfileImage(
            String loginId, String roomCode, FitRoomProfileUpdateRequest request) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        String previousImageUrl = membership.getProfileImageUrl();
        String imageUrl = normalizeOptionalImageUrl(request.profileImageUrl());
        membership.updateProfileImage(imageUrl);
        if (!Objects.equals(previousImageUrl, imageUrl)) {
            deleteImageAfterCommit(previousImageUrl);
        }
        return toRoomState(membership.getRoom(), user, membership);
    }

    @Transactional
    public FitRoomStateResponse saveMyLog(String loginId, String roomCode, FitLogSaveRequest request) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        FitRoom room = membership.getRoom();
        LocalDate today = today();
        String imageUrl = normalizeRequiredImageUrl(request.imageUrl());
        String caption = trimToNull(request.caption());
        Optional<FitLog> existing = fitLogRepository.findByRoom_RoomIdxAndAuthor_UserIdxAndFitDate(
                room.getRoomIdx(), user.getUserIdx(), today);

        if (existing.isPresent()) {
            FitLog fitLog = existing.get();
            String previousImageUrl = fitLog.getImageUrl();
            fitLog.update(imageUrl, caption);
            if (!Objects.equals(previousImageUrl, imageUrl)) {
                deleteImageAfterCommit(previousImageUrl);
            }
        } else {
            fitLogRepository.save(new FitLog(room, user, today, imageUrl, caption));
        }

        return toRoomState(room, user, membership);
    }

    @Transactional
    public FitRoomStateResponse deleteMyLog(String loginId, String roomCode) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        FitRoom room = membership.getRoom();
        fitLogRepository
                .findByRoom_RoomIdxAndAuthor_UserIdxAndFitDate(room.getRoomIdx(), user.getUserIdx(), today())
                .ifPresent(fitLog -> {
                    fitLogRepository.delete(fitLog);
                    deleteImageAfterCommit(fitLog.getImageUrl());
                });
        return toRoomState(room, user, membership);
    }

    @Transactional
    public FitRoomStateResponse updateLogCaption(
            String loginId, String roomCode, String memberId, FitLogCaptionUpdateRequest request) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        Long targetUserIdx = parseTargetUserIdx(memberId, user.getUserIdx());
        if (!user.getUserIdx().equals(targetUserIdx)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the author can update a FitLog caption.");
        }

        FitLog fitLog = findTodayLog(membership.getRoom(), targetUserIdx);
        fitLog.updateCaption(trimToNull(request.caption()));
        return toRoomState(membership.getRoom(), user, membership);
    }

    @Transactional
    public FitRoomStateResponse kickMember(String loginId, String roomCode, String memberId) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        FitRoom room = membership.getRoom();
        requireHost(room, user.getUserIdx());
        Long targetUserIdx = parseTargetUserIdx(memberId, user.getUserIdx());
        if (user.getUserIdx().equals(targetUserIdx)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The host cannot remove themself from the room.");
        }
        FitRoomMember target = fitRoomMemberRepository
                .findByRoom_RoomIdxAndUser_UserIdx(room.getRoomIdx(), targetUserIdx)
                .filter(value -> value.getMemberStatus() == FitRoomMemberStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Active FitLog room member was not found."));
        target.kick();
        return toRoomState(room, user, membership);
    }

    @Transactional
    public FitRoomStateResponse addReaction(
            String loginId, String roomCode, String memberId, FitLogReactionRequest request) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        FitRoom room = membership.getRoom();
        Long targetUserIdx = parseTargetUserIdx(memberId, user.getUserIdx());
        ensureActiveMember(room, targetUserIdx);
        FitLog targetLog = findTodayLog(room, targetUserIdx);
        String emoji = request.emoji().trim();
        if (fitLogReactionRepository
                .findByFitLog_FitLogIdxAndUser_UserIdxAndEmoji(targetLog.getFitLogIdx(), user.getUserIdx(), emoji)
                .isEmpty()) {
            fitLogReactionRepository.save(new FitLogReaction(targetLog, user, emoji));
        }
        return toRoomState(room, user, membership);
    }

    @Transactional
    public FitRoomStateResponse sendMessage(String loginId, String roomCode, FitRoomMessageRequest request) {
        UserAccount user = findUser(loginId);
        FitRoomMember membership = findActiveMembership(roomCode, user.getUserIdx());
        FitRoom room = membership.getRoom();
        FitRoomMessageType messageType;
        try {
            messageType = FitRoomMessageType.from(request.type());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported FitLog message type.");
        }

        FitLog quotedFitLog = null;
        if (request.quotedMemberId() != null && !request.quotedMemberId().isBlank()) {
            Long quotedUserIdx = parseTargetUserIdx(request.quotedMemberId(), user.getUserIdx());
            ensureActiveMember(room, quotedUserIdx);
            quotedFitLog = findTodayLog(room, quotedUserIdx);
        }

        fitRoomMessageRepository.save(
                new FitRoomMessage(room, user, messageType, request.text().trim(), quotedFitLog));
        return toRoomState(room, user, membership);
    }

    @Transactional
    public FitImageUploadResponse storeFitLogImage(String loginId, MultipartFile image) {
        UserAccount user = findUser(loginId);
        return new FitImageUploadResponse(imageStorage.store(FIT_LOG_IMAGE_SCOPE, user.getUserIdx(), image));
    }

    @Transactional
    public FitImageUploadResponse storeProfileImage(String loginId, MultipartFile image) {
        UserAccount user = findUser(loginId);
        return new FitImageUploadResponse(imageStorage.store(FIT_ROOM_PROFILE_IMAGE_SCOPE, user.getUserIdx(), image));
    }

    private FitRoomResponse toRoomResponse(FitRoomMember membership) {
        FitRoom room = membership.getRoom();
        return toRoomResponse(
                room,
                membership.getMemberRole(),
                room.isHostedBy(membership.getUser().getUserIdx()));
    }

    private FitRoomResponse toRoomResponse(FitRoom room, FitRoomMemberRole role, boolean isHost) {
        long activeMembers = fitRoomMemberRepository.countByRoom_RoomIdxAndMemberStatus(
                room.getRoomIdx(), FitRoomMemberStatus.ACTIVE);
        long completedLogs =
                fitLogRepository.countTodayLogsForActiveMembers(room.getRoomIdx(), today(), FitRoomMemberStatus.ACTIVE);
        Optional<FitRoomMessage> latestMessage = fitRoomMessageRepository
                .findTopByRoom_RoomIdxOrderByCreatedAtDesc(room.getRoomIdx())
                .filter(message -> !message.getContent().isBlank());
        String status = latestMessage.map(FitRoomMessage::getContent).orElse(DEFAULT_ROOM_STATUS);
        String recentMessageAuthor = latestMessage
                .map(message -> message.getSender().getNickname())
                .filter(value -> !value.isBlank())
                .orElse("");
        return new FitRoomResponse(
                room.getRoomIdx(),
                room.getRoomIdx(),
                room.getRoomCode(),
                room.getName(),
                status,
                recentMessageAuthor,
                activeMembers > 0 && activeMembers == completedLogs,
                room.getMemberLimit(),
                role.name().toLowerCase(),
                isHost,
                room.getCreatedAt(),
                room.getUpdatedAt());
    }

    private FitRoomStateResponse toRoomState(FitRoom room, UserAccount currentUser, FitRoomMember currentMembership) {
        List<FitRoomMember> activeMembers =
                fitRoomMemberRepository.findAllByRoomIdxAndStatus(room.getRoomIdx(), FitRoomMemberStatus.ACTIVE);
        Map<Long, FitLog> logsByUserIdx =
                fitLogRepository.findAllByRoomIdxAndFitDateWithAuthor(room.getRoomIdx(), today()).stream()
                        .collect(java.util.stream.Collectors.toMap(
                                fitLog -> fitLog.getAuthor().getUserIdx(), fitLog -> fitLog));
        List<FitRoomMemberResponse> members = activeMembers.stream()
                .filter(member -> !member.getUser().getUserIdx().equals(currentUser.getUserIdx()))
                .map(member -> toMemberResponse(
                        member, logsByUserIdx.get(member.getUser().getUserIdx())))
                .toList();
        FitLog myLog = logsByUserIdx.get(currentUser.getUserIdx());
        Map<String, String> reactions = new LinkedHashMap<>();
        Map<String, List<FitLogReactionResponse>> reactionDetails = new LinkedHashMap<>();
        // One FitLog can collect several emojis, so the badge keeps every distinct one instead of
        // letting the last row read from the database overwrite the others.
        Map<String, LinkedHashSet<String>> emojisByTarget = new LinkedHashMap<>();
        for (FitLogReaction reaction :
                fitLogReactionRepository.findAllByRoomIdxAndFitDate(room.getRoomIdx(), today())) {
            String targetKey = roomMemberKey(reaction.getFitLog().getAuthor().getUserIdx(), currentUser.getUserIdx());
            emojisByTarget
                    .computeIfAbsent(targetKey, ignored -> new LinkedHashSet<>())
                    .add(reaction.getEmoji());
            reactionDetails
                    .computeIfAbsent(targetKey, ignored -> new ArrayList<>())
                    .add(new FitLogReactionResponse(reaction.getUser().getNickname(), reaction.getEmoji()));
        }
        emojisByTarget.forEach((targetKey, emojis) -> reactions.put(targetKey, String.join("", emojis)));

        List<FitRoomMessageResponse> messages =
                fitRoomMessageRepository.findAllByRoomIdxWithDetails(room.getRoomIdx()).stream()
                        .map(this::toMessageResponse)
                        .toList();
        return new FitRoomStateResponse(
                currentMembership.getProfileImageUrl(),
                members,
                myLog == null
                        ? new FitLogSummaryResponse("", "")
                        : new FitLogSummaryResponse(myLog.getImageUrl(), nullToEmpty(myLog.getCaption())),
                reactions,
                reactionDetails,
                messages);
    }

    private FitRoomMemberResponse toMemberResponse(FitRoomMember member, FitLog fitLog) {
        return new FitRoomMemberResponse(
                member.getUser().getUserIdx(),
                member.getUser().getNickname(),
                member.getProfileImageUrl(),
                fitLog == null ? null : fitLog.getImageUrl(),
                fitLog == null ? "" : nullToEmpty(fitLog.getCaption()),
                member.getMemberRole() == FitRoomMemberRole.HOST);
    }

    private FitRoomMessageResponse toMessageResponse(FitRoomMessage message) {
        FitLog quotedFitLog = message.getQuotedFitLog();
        FitLogQuoteResponse quote = quotedFitLog == null
                ? null
                : new FitLogQuoteResponse(
                        quotedFitLog.getAuthor().getUserIdx(),
                        quotedFitLog.getAuthor().getNickname(),
                        quotedFitLog.getImageUrl(),
                        nullToEmpty(quotedFitLog.getCaption()));
        return new FitRoomMessageResponse(
                message.getMessageIdx(),
                message.getSender().getNickname(),
                message.getContent(),
                message.getMessageType().name().toLowerCase(),
                quote,
                message.getCreatedAt());
    }

    private void deleteRoom(FitRoom room) {
        LinkedHashSet<String> imageUrls = new LinkedHashSet<>();
        imageUrls.addAll(fitLogRepository.findImageUrlsByRoomIdx(room.getRoomIdx()));
        imageUrls.addAll(fitRoomMemberRepository.findProfileImageUrlsByRoomIdx(room.getRoomIdx()));
        // The room row alone cannot be removed while chat messages still quote its FitLogs, so the
        // children are deleted here in dependency order instead of relying on database cascades.
        fitLogReactionRepository.deleteAllByRoomIdx(room.getRoomIdx());
        fitRoomMessageRepository.deleteAllByRoomIdx(room.getRoomIdx());
        fitLogRepository.deleteAllByRoomIdx(room.getRoomIdx());
        fitRoomMemberRepository.deleteAllByRoomIdx(room.getRoomIdx());
        fitRoomRepository.delete(room);
        deleteImagesAfterCommit(imageUrls);
    }

    private void requireHost(FitRoom room, Long userIdx) {
        if (!room.isHostedBy(userIdx)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the FitLog room host can perform this action.");
        }
    }

    private FitRoomMember findActiveMembership(String roomCode, Long userIdx) {
        Optional<FitRoomMember> membership =
                fitRoomMemberRepository.findActiveByRoomCodeAndUserIdx(roomCode, userIdx, FitRoomMemberStatus.ACTIVE);
        if (membership.isEmpty()) {
            membership = findActiveMembershipByRoomIdx(roomCode, userIdx);
        }
        return membership.orElseThrow(
                () -> new ApiException(HttpStatus.FORBIDDEN, "You are not an active member of this FitLog room."));
    }

    private Optional<FitRoomMember> findActiveMembershipByRoomIdx(String roomReference, Long userIdx) {
        try {
            long roomIdx = Long.parseLong(roomReference);
            if (roomIdx <= 0) {
                return Optional.empty();
            }
            return fitRoomMemberRepository.findActiveByRoomIdxAndUserIdx(roomIdx, userIdx, FitRoomMemberStatus.ACTIVE);
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    private FitRoom findRoom(String roomCode) {
        return fitRoomRepository
                .findByRoomCode(roomCode)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FitLog room was not found."));
    }

    private UserAccount findUser(String loginId) {
        return userRepository
                .findByLoginId(loginId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User was not found."));
    }

    private FitLog findTodayLog(FitRoom room, Long userIdx) {
        return fitLogRepository
                .findByRoom_RoomIdxAndAuthor_UserIdxAndFitDate(room.getRoomIdx(), userIdx, today())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Today's FitLog was not found."));
    }

    private void ensureActiveMember(FitRoom room, Long userIdx) {
        fitRoomMemberRepository
                .findByRoom_RoomIdxAndUser_UserIdx(room.getRoomIdx(), userIdx)
                .filter(member -> member.getMemberStatus() == FitRoomMemberStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Active FitLog room member was not found."));
    }

    private Long parseTargetUserIdx(String memberId, Long currentUserIdx) {
        if (memberId == null || memberId.isBlank() || "host".equalsIgnoreCase(memberId)) {
            return currentUserIdx;
        }
        try {
            return Long.parseLong(memberId);
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid FitLog room member id.");
        }
    }

    private String generateRoomCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String code = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            if (!fitRoomRepository.existsByRoomCode(code)) {
                return code;
            }
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to generate a FitLog room code.");
    }

    private String normalizeRequiredImageUrl(String imageUrl) {
        String value = normalizeOptionalImageUrl(imageUrl);
        if (value == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FitLog image URL is required.");
        }
        return value;
    }

    private String normalizeOptionalImageUrl(String imageUrl) {
        String value = trimToNull(imageUrl);
        if (value == null) {
            return null;
        }
        if (value.regionMatches(true, 0, "data:", 0, 5)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image data URLs are not supported.");
        }
        try {
            URI uri = new URI(value);
            if (uri.getHost() == null
                    || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Image URL must be an absolute HTTP(S) URL.");
            }
            return value;
        } catch (URISyntaxException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image URL must be an absolute HTTP(S) URL.");
        }
    }

    private void deleteImageAfterCommit(String imageUrl) {
        if (imageUrl == null) {
            return;
        }
        deleteImagesAfterCommit(List.of(imageUrl));
    }

    private void deleteImagesAfterCommit(Iterable<String> imageUrls) {
        List<String> urls = new ArrayList<>();
        for (String imageUrl : imageUrls) {
            if (imageUrl != null) {
                urls.add(imageUrl);
            }
        }
        if (urls.isEmpty()) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            urls.forEach(imageStorage::delete);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                urls.forEach(imageStorage::delete);
            }
        });
    }

    private LocalDate today() {
        return LocalDate.now(KOREA_ZONE_ID);
    }

    private String roomMemberKey(Long targetUserIdx, Long currentUserIdx) {
        return targetUserIdx.equals(currentUserIdx) ? "host" : targetUserIdx.toString();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
