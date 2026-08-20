package com.mycloset.backend.fitlog;

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
import jakarta.persistence.Table;

import com.mycloset.backend.user.UserAccount;

@Entity
@Table(name = "fit_log_reactions")
public class FitLogReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reaction_idx")
    private Long reactionIdx;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fit_log_idx", nullable = false)
    private FitLog fitLog;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_idx", nullable = false)
    private UserAccount user;

    @Column(name = "emoji", nullable = false, length = 32)
    private String emoji;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected FitLogReaction() {}

    public FitLogReaction(FitLog fitLog, UserAccount user, String emoji) {
        this.fitLog = fitLog;
        this.user = user;
        this.emoji = emoji;
    }

    public Long getReactionIdx() {
        return reactionIdx;
    }

    public FitLog getFitLog() {
        return fitLog;
    }

    public UserAccount getUser() {
        return user;
    }

    public String getEmoji() {
        return emoji;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
