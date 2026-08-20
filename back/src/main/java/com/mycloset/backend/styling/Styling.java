package com.mycloset.backend.styling;

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
@Table(name = "stylings")
public class Styling {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "styling_idx")
    private Long stylingIdx;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_idx", nullable = false)
    private UserAccount user;

    @Column(name = "name", nullable = false, length = 30)
    private String name;

    @Column(name = "memo", length = 200)
    private String memo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Styling() {}

    public Styling(UserAccount user, String name, String memo) {
        this.user = user;
        update(name, memo);
    }

    public void update(String name, String memo) {
        this.name = name;
        this.memo = memo;
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

    public Long getStylingIdx() {
        return stylingIdx;
    }

    public String getName() {
        return name;
    }

    public String getMemo() {
        return memo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
