package com.mycloset.backend.fitlog;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import com.mycloset.backend.user.UserAccount;

@Entity
@Table(name = "fit_room_members")
public class FitRoomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_member_idx")
    private Long roomMemberIdx;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_idx", nullable = false)
    private FitRoom room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_idx", nullable = false)
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false, length = 20)
    private FitRoomMemberRole memberRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_status", nullable = false, length = 20)
    private FitRoomMemberStatus memberStatus;

    @Column(name = "profile_image_url", length = 512)
    private String profileImageUrl;

    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected FitRoomMember() {}

    public FitRoomMember(FitRoom room, UserAccount user, FitRoomMemberRole memberRole) {
        this.room = room;
        this.user = user;
        this.memberRole = memberRole;
        this.memberStatus = FitRoomMemberStatus.ACTIVE;
    }

    public void rejoin() {
        memberRole = FitRoomMemberRole.MEMBER;
        memberStatus = FitRoomMemberStatus.ACTIVE;
        joinedAt = LocalDateTime.now();
        leftAt = null;
    }

    public void leave() {
        memberStatus = FitRoomMemberStatus.LEFT;
        leftAt = LocalDateTime.now();
    }

    public void kick() {
        memberStatus = FitRoomMemberStatus.KICKED;
        leftAt = LocalDateTime.now();
    }

    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public Long getRoomMemberIdx() {
        return roomMemberIdx;
    }

    public FitRoom getRoom() {
        return room;
    }

    public UserAccount getUser() {
        return user;
    }

    public FitRoomMemberRole getMemberRole() {
        return memberRole;
    }

    public FitRoomMemberStatus getMemberStatus() {
        return memberStatus;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public LocalDateTime getLastReadAt() {
        return lastReadAt;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public LocalDateTime getLeftAt() {
        return leftAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (joinedAt == null) {
            joinedAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
