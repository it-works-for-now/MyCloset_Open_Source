package com.mycloset.backend.clothes;

import java.sql.Types;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
@Table(name = "clothes")
public class Clothes {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "clothes_idx")
    private Long clothesIdx;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_idx", nullable = false)
    private UserAccount user;

    @Column(name = "alias", length = 50)
    private String alias;

    @Column(name = "category", length = 30)
    private String category;

    @Column(name = "subcategory", length = 50)
    private String subcategory;

    @Column(name = "pattern_type", length = 30)
    private String pattern;

    @Column(name = "warmth_level")
    @JdbcTypeCode(Types.TINYINT)
    private Integer warmthLevel;

    @Column(name = "memo", length = 1000)
    private String memo;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "clothes_colors", joinColumns = @JoinColumn(name = "clothes_idx"))
    @Column(name = "color", nullable = false, length = 30)
    private Set<String> colors = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "clothes_seasons", joinColumns = @JoinColumn(name = "clothes_idx"))
    @Column(name = "season", nullable = false, length = 20)
    private Set<String> seasons = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "clothes_style_tags", joinColumns = @JoinColumn(name = "clothes_idx"))
    @Column(name = "style_tag", nullable = false, length = 50)
    private Set<String> styleTags = new LinkedHashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Clothes() {}

    public Clothes(UserAccount user, ClothesValues values) {
        this.user = user;
        apply(values);
    }

    public void update(ClothesValues values) {
        apply(values);
    }

    private void apply(ClothesValues values) {
        alias = values.alias();
        category = values.category();
        subcategory = values.subcategory();
        pattern = values.pattern();
        warmthLevel = values.warmthLevel();
        memo = values.memo();
        imageUrl = values.imageUrl();
        colors.clear();
        colors.addAll(values.colors());
        seasons.clear();
        seasons.addAll(values.seasons());
        styleTags.clear();
        styleTags.addAll(values.styleTags());
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

    public Long getClothesIdx() {
        return clothesIdx;
    }

    public String getAlias() {
        return alias;
    }

    public String getCategory() {
        return category;
    }

    public String getSubcategory() {
        return subcategory;
    }

    public String getPattern() {
        return pattern;
    }

    public Integer getWarmthLevel() {
        return warmthLevel;
    }

    public String getMemo() {
        return memo;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Set<String> getColors() {
        return colors;
    }

    public Set<String> getSeasons() {
        return seasons;
    }

    public Set<String> getStyleTags() {
        return styleTags;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
