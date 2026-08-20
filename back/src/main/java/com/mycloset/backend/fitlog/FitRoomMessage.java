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
@Table(name = "fit_room_messages")
public class FitRoomMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_idx")
    private Long messageIdx;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_idx", nullable = false)
    private FitRoom room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_user_idx", nullable = false)
    private UserAccount sender;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    private FitRoomMessageType messageType;

    @Column(name = "content", nullable = false, length = 2000)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quoted_fit_log_idx")
    private FitLog quotedFitLog;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected FitRoomMessage() {}

    public FitRoomMessage(
            FitRoom room, UserAccount sender, FitRoomMessageType messageType, String content, FitLog quotedFitLog) {
        this.room = room;
        this.sender = sender;
        this.messageType = messageType;
        this.content = content;
        this.quotedFitLog = quotedFitLog;
    }

    public Long getMessageIdx() {
        return messageIdx;
    }

    public FitRoom getRoom() {
        return room;
    }

    public UserAccount getSender() {
        return sender;
    }

    public FitRoomMessageType getMessageType() {
        return messageType;
    }

    public String getContent() {
        return content;
    }

    public FitLog getQuotedFitLog() {
        return quotedFitLog;
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
