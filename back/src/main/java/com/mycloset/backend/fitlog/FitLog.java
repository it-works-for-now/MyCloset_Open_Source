package com.mycloset.backend.fitlog;

import java.time.LocalDate;
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

import com.mycloset.backend.user.UserAccount;

@Entity
@Table(name = "fit_logs")
public class FitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "fit_log_idx")
    private Long fitLogIdx;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_idx", nullable = false)
    private FitRoom room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_user_idx", nullable = false)
    private UserAccount author;

    @Column(name = "fit_date", nullable = false)
    private LocalDate fitDate;

    @Column(name = "image_url", nullable = false, length = 512)
    private String imageUrl;

    @Column(name = "caption", length = 1000)
    private String caption;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected FitLog() {}

    public FitLog(FitRoom room, UserAccount author, LocalDate fitDate, String imageUrl, String caption) {
        this.room = room;
        this.author = author;
        this.fitDate = fitDate;
        this.imageUrl = imageUrl;
        this.caption = caption;
    }

    public void update(String imageUrl, String caption) {
        this.imageUrl = imageUrl;
        this.caption = caption;
    }

    public void updateCaption(String caption) {
        this.caption = caption;
    }

    public Long getFitLogIdx() {
        return fitLogIdx;
    }

    public FitRoom getRoom() {
        return room;
    }

    public UserAccount getAuthor() {
        return author;
    }

    public LocalDate getFitDate() {
        return fitDate;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getCaption() {
        return caption;
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
