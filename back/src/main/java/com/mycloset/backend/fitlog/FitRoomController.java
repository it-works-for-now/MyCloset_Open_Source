package com.mycloset.backend.fitlog;

import java.security.Principal;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mycloset.backend.fitlog.dto.FitImageUploadResponse;
import com.mycloset.backend.fitlog.dto.FitLogCaptionUpdateRequest;
import com.mycloset.backend.fitlog.dto.FitLogReactionRequest;
import com.mycloset.backend.fitlog.dto.FitLogSaveRequest;
import com.mycloset.backend.fitlog.dto.FitRoomCreateRequest;
import com.mycloset.backend.fitlog.dto.FitRoomJoinRequest;
import com.mycloset.backend.fitlog.dto.FitRoomMessageRequest;
import com.mycloset.backend.fitlog.dto.FitRoomProfileUpdateRequest;
import com.mycloset.backend.fitlog.dto.FitRoomResponse;
import com.mycloset.backend.fitlog.dto.FitRoomStateResponse;
import com.mycloset.backend.fitlog.dto.FitRoomUpdateRequest;

@RestController
@RequestMapping("/api")
public class FitRoomController {

    private final FitLogService fitLogService;

    public FitRoomController(FitLogService fitLogService) {
        this.fitLogService = fitLogService;
    }

    @GetMapping("/fit-rooms")
    public List<FitRoomResponse> list(Principal principal) {
        return fitLogService.findMyRooms(principal.getName());
    }

    @PostMapping("/fit-rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public FitRoomResponse create(Principal principal, @Valid @RequestBody FitRoomCreateRequest request) {
        return fitLogService.createRoom(principal.getName(), request);
    }

    @GetMapping("/fit-rooms/by-code/{roomCode}")
    public FitRoomResponse preview(@PathVariable String roomCode) {
        return fitLogService.previewRoom(roomCode);
    }

    @PostMapping("/fit-rooms/join")
    public FitRoomResponse join(Principal principal, @Valid @RequestBody FitRoomJoinRequest request) {
        return fitLogService.joinRoom(principal.getName(), request);
    }

    @GetMapping("/fit-rooms/{roomCode}")
    public FitRoomStateResponse state(Principal principal, @PathVariable String roomCode) {
        return fitLogService.getRoomState(principal.getName(), roomCode);
    }

    @PatchMapping("/fit-rooms/{roomCode}")
    public FitRoomResponse update(
            Principal principal, @PathVariable String roomCode, @Valid @RequestBody FitRoomUpdateRequest request) {
        return fitLogService.updateRoom(principal.getName(), roomCode, request);
    }

    @PostMapping("/fit-rooms/{roomCode}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(Principal principal, @PathVariable String roomCode) {
        fitLogService.leaveRoom(principal.getName(), roomCode);
    }

    @DeleteMapping("/fit-rooms/{roomCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable String roomCode) {
        fitLogService.deleteRoom(principal.getName(), roomCode);
    }

    @PostMapping(value = "/fit-rooms/profile-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FitImageUploadResponse uploadProfileImage(
            Principal principal, @RequestPart(value = "image", required = false) MultipartFile image) {
        return fitLogService.storeProfileImage(principal.getName(), image);
    }

    @PatchMapping("/fit-rooms/{roomCode}/members/me/profile")
    public FitRoomStateResponse updateMyProfileImage(
            Principal principal,
            @PathVariable String roomCode,
            @Valid @RequestBody FitRoomProfileUpdateRequest request) {
        return fitLogService.updateMyProfileImage(principal.getName(), roomCode, request);
    }

    @DeleteMapping("/fit-rooms/{roomCode}/members/{memberId}")
    public FitRoomStateResponse kick(
            Principal principal, @PathVariable String roomCode, @PathVariable String memberId) {
        return fitLogService.kickMember(principal.getName(), roomCode, memberId);
    }

    @PutMapping("/fit-rooms/{roomCode}/logs/me")
    public FitRoomStateResponse saveMyLog(
            Principal principal, @PathVariable String roomCode, @Valid @RequestBody FitLogSaveRequest request) {
        return fitLogService.saveMyLog(principal.getName(), roomCode, request);
    }

    @DeleteMapping("/fit-rooms/{roomCode}/logs/me")
    public FitRoomStateResponse deleteMyLog(Principal principal, @PathVariable String roomCode) {
        return fitLogService.deleteMyLog(principal.getName(), roomCode);
    }

    @PatchMapping("/fit-rooms/{roomCode}/logs/{memberId}")
    public FitRoomStateResponse updateCaption(
            Principal principal,
            @PathVariable String roomCode,
            @PathVariable String memberId,
            @Valid @RequestBody FitLogCaptionUpdateRequest request) {
        return fitLogService.updateLogCaption(principal.getName(), roomCode, memberId, request);
    }

    @PostMapping("/fit-rooms/{roomCode}/logs/{memberId}/reactions")
    public FitRoomStateResponse addReaction(
            Principal principal,
            @PathVariable String roomCode,
            @PathVariable String memberId,
            @Valid @RequestBody FitLogReactionRequest request) {
        return fitLogService.addReaction(principal.getName(), roomCode, memberId, request);
    }

    @PostMapping("/fit-rooms/{roomCode}/messages")
    public FitRoomStateResponse sendMessage(
            Principal principal, @PathVariable String roomCode, @Valid @RequestBody FitRoomMessageRequest request) {
        return fitLogService.sendMessage(principal.getName(), roomCode, request);
    }

    @PostMapping(value = "/fit-logs/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FitImageUploadResponse uploadFitLogImage(
            Principal principal, @RequestPart(value = "image", required = false) MultipartFile image) {
        return fitLogService.storeFitLogImage(principal.getName(), image);
    }
}
