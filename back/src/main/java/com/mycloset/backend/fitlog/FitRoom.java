package com.mycloset.backend.fitlog;

import java.sql.Types;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;

import com.mycloset.backend.user.UserAccount;

@Entity
@Table(name = "fit_rooms")
public class FitRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_idx")
    private Long roomIdx;

    @Column(name = "room_code", nullable = false, unique = true, length = 32)
    private String roomCode;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @JdbcTypeCode(Types.TINYINT)
    @Column(name = "member_limit", nullable = false)
    private Integer memberLimit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_user_idx", nullable = false)
    private UserAccount host;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected FitRoom() {}

    public FitRoom(String roomCode, String name, Integer memberLimit, UserAccount host) {
        this.roomCode = roomCode;
        this.name = name;
        this.memberLimit = memberLimit;
        this.host = host;
    }

    public void rename(String name) {
        this.name = name;
    }

    public boolean isHostedBy(Long userIdx) {
        return host.getUserIdx().equals(userIdx);
    }

    public Long getRoomIdx() {
        return roomIdx;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public String getName() {
        return name;
    }

    public Integer getMemberLimit() {
        return memberLimit;
    }

    public UserAccount getHost() {
        return host;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
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
