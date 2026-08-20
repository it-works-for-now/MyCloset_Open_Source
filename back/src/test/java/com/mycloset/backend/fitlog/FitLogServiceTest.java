package com.mycloset.backend.fitlog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.fitlog.dto.FitLogSaveRequest;
import com.mycloset.backend.fitlog.dto.FitRoomCreateRequest;
import com.mycloset.backend.fitlog.dto.FitRoomJoinRequest;
import com.mycloset.backend.fitlog.dto.FitRoomResponse;
import com.mycloset.backend.fitlog.dto.FitRoomUpdateRequest;
import com.mycloset.backend.image.ImageStorage;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class FitLogServiceTest {

    private static final String OLD_IMAGE_URL = "http://localhost:8080/uploads/fit-logs/7/old.jpg";
    private static final String NEW_IMAGE_URL = "http://localhost:8080/uploads/fit-logs/7/new.jpg";

    @Mock
    private FitRoomRepository fitRoomRepository;

    @Mock
    private FitRoomMemberRepository fitRoomMemberRepository;

    @Mock
    private FitLogRepository fitLogRepository;

    @Mock
    private FitLogReactionRepository fitLogReactionRepository;

    @Mock
    private FitRoomMessageRepository fitRoomMessageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ImageStorage imageStorage;

    private FitLogService fitLogService;
    private UserAccount host;
    private UserAccount member;

    @BeforeEach
    void setUp() {
        fitLogService = new FitLogService(
                fitRoomRepository,
                fitRoomMemberRepository,
                fitLogRepository,
                fitLogReactionRepository,
                fitRoomMessageRepository,
                userRepository,
                imageStorage);
        host = user(7L, "host", "Host");
        member = user(8L, "member", "Member");
        lenient().when(userRepository.findByLoginId("host")).thenReturn(Optional.of(host));
        lenient().when(userRepository.findByLoginId("member")).thenReturn(Optional.of(member));
        lenient()
                .when(fitRoomMessageRepository.findTopByRoom_RoomIdxOrderByCreatedAtDesc(any()))
                .thenReturn(Optional.empty());
    }

    @Test
    void createsRoomAndAddsTheCreatorAsHost() {
        when(fitRoomRepository.existsByRoomCode(anyString())).thenReturn(false);
        when(fitRoomRepository.save(any(FitRoom.class))).thenAnswer(invocation -> {
            FitRoom room = invocation.getArgument(0);
            ReflectionTestUtils.setField(room, "roomIdx", 31L);
            return room;
        });
        when(fitRoomMemberRepository.save(any(FitRoomMember.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FitRoomResponse response = fitLogService.createRoom("host", new FitRoomCreateRequest("  Morning looks  ", 4));

        assertEquals("Morning looks", response.name());
        assertEquals("host", response.role());
        assertEquals(true, response.isHost());
        assertEquals(4, response.memberLimit());
        verify(fitRoomMemberRepository).save(any(FitRoomMember.class));
    }

    @Test
    void rejectsJoiningAFullRoom() {
        FitRoom room = room(31L, "invite01", 2, host);
        when(fitRoomRepository.findByRoomCodeForUpdate("invite01")).thenReturn(Optional.of(room));
        when(fitRoomMemberRepository.findByRoom_RoomIdxAndUser_UserIdx(31L, 8L)).thenReturn(Optional.empty());
        when(fitRoomMemberRepository.countByRoom_RoomIdxAndMemberStatus(31L, FitRoomMemberStatus.ACTIVE))
                .thenReturn(2L);

        ApiException exception = assertThrows(
                ApiException.class, () -> fitLogService.joinRoom("member", new FitRoomJoinRequest("invite01")));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(fitRoomMemberRepository, never()).save(any(FitRoomMember.class));
    }

    @Test
    void rejectsRoomNameChangesFromANonHost() {
        FitRoom room = room(31L, "invite01", 4, host);
        FitRoomMember membership = new FitRoomMember(room, member, FitRoomMemberRole.MEMBER);
        when(fitRoomMemberRepository.findActiveByRoomCodeAndUserIdx("invite01", 8L, FitRoomMemberStatus.ACTIVE))
                .thenReturn(Optional.of(membership));

        ApiException exception = assertThrows(
                ApiException.class,
                () -> fitLogService.updateRoom("member", "invite01", new FitRoomUpdateRequest("Changed")));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
        assertEquals("Room", room.getName());
    }

    @Test
    void allowsTheHostToUpdateARoomUsingItsNumericId() {
        FitRoom room = room(31L, "invite01", 4, host);
        FitRoomMember membership = new FitRoomMember(room, host, FitRoomMemberRole.HOST);
        when(fitRoomMemberRepository.findActiveByRoomCodeAndUserIdx("31", 7L, FitRoomMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());
        when(fitRoomMemberRepository.findActiveByRoomIdxAndUserIdx(31L, 7L, FitRoomMemberStatus.ACTIVE))
                .thenReturn(Optional.of(membership));

        fitLogService.updateRoom("host", "31", new FitRoomUpdateRequest("Changed"));

        assertEquals("Changed", room.getName());
        verify(fitRoomMemberRepository).findActiveByRoomIdxAndUserIdx(31L, 7L, FitRoomMemberStatus.ACTIVE);
    }

    @Test
    void replacingTodaysLogDeletesThePreviousImageAfterTheDatabaseUpdate() {
        FitRoom room = room(31L, "invite01", 4, host);
        FitRoomMember membership = new FitRoomMember(room, host, FitRoomMemberRole.HOST);
        FitLog log = log(41L, room, host, OLD_IMAGE_URL);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        when(fitRoomMemberRepository.findActiveByRoomCodeAndUserIdx("invite01", 7L, FitRoomMemberStatus.ACTIVE))
                .thenReturn(Optional.of(membership));
        when(fitLogRepository.findByRoom_RoomIdxAndAuthor_UserIdxAndFitDate(31L, 7L, today))
                .thenReturn(Optional.of(log));
        when(fitRoomMemberRepository.findAllByRoomIdxAndStatus(31L, FitRoomMemberStatus.ACTIVE))
                .thenReturn(List.of(membership));
        when(fitLogRepository.findAllByRoomIdxAndFitDateWithAuthor(31L, today)).thenReturn(List.of(log));
        when(fitLogReactionRepository.findAllByRoomIdxAndFitDate(31L, today)).thenReturn(List.of());
        when(fitRoomMessageRepository.findAllByRoomIdxWithDetails(31L)).thenReturn(List.of());

        fitLogService.saveMyLog("host", "invite01", new FitLogSaveRequest(NEW_IMAGE_URL, "Today"));

        assertEquals(NEW_IMAGE_URL, log.getImageUrl());
        assertEquals("Today", log.getCaption());
        verify(imageStorage).delete(OLD_IMAGE_URL);
    }

    @Test
    void hostLeavingDeletesTheRoomAndAllItsManagedImages() {
        FitRoom room = room(31L, "invite01", 4, host);
        FitRoomMember membership = new FitRoomMember(room, host, FitRoomMemberRole.HOST);
        when(fitRoomMemberRepository.findActiveByRoomCodeAndUserIdx("invite01", 7L, FitRoomMemberStatus.ACTIVE))
                .thenReturn(Optional.of(membership));
        when(fitLogRepository.findImageUrlsByRoomIdx(31L)).thenReturn(List.of(OLD_IMAGE_URL));
        when(fitRoomMemberRepository.findProfileImageUrlsByRoomIdx(31L))
                .thenReturn(List.of("http://localhost:8080/uploads/fit-room-profiles/7/profile.png"));

        fitLogService.leaveRoom("host", "invite01");

        verify(fitRoomRepository).delete(room);
        verify(imageStorage).delete(OLD_IMAGE_URL);
        verify(imageStorage).delete("http://localhost:8080/uploads/fit-room-profiles/7/profile.png");
    }

    @Test
    void onlyTheHostCanKickAnotherMember() {
        FitRoom room = room(31L, "invite01", 4, host);
        FitRoomMember membership = new FitRoomMember(room, member, FitRoomMemberRole.MEMBER);
        when(fitRoomMemberRepository.findActiveByRoomCodeAndUserIdx("invite01", 8L, FitRoomMemberStatus.ACTIVE))
                .thenReturn(Optional.of(membership));

        ApiException exception =
                assertThrows(ApiException.class, () -> fitLogService.kickMember("member", "invite01", "7"));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
        verify(fitRoomMemberRepository, never()).findByRoom_RoomIdxAndUser_UserIdx(eq(31L), any());
    }

    private FitRoom room(Long roomIdx, String roomCode, int memberLimit, UserAccount roomHost) {
        FitRoom room = new FitRoom(roomCode, "Room", memberLimit, roomHost);
        ReflectionTestUtils.setField(room, "roomIdx", roomIdx);
        return room;
    }

    private FitLog log(Long fitLogIdx, FitRoom room, UserAccount author, String imageUrl) {
        FitLog fitLog = new FitLog(room, author, LocalDate.now(ZoneId.of("Asia/Seoul")), imageUrl, "Before");
        ReflectionTestUtils.setField(fitLog, "fitLogIdx", fitLogIdx);
        return fitLog;
    }

    private UserAccount user(Long userIdx, String loginId, String nickname) {
        UserAccount account = new UserAccount(loginId, "encoded-password", nickname, loginId + "@example.com");
        ReflectionTestUtils.setField(account, "userIdx", userIdx);
        return account;
    }
}
