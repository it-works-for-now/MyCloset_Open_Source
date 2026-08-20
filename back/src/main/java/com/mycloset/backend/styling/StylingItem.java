package com.mycloset.backend.styling;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "styling_items")
public class StylingItem {

    @EmbeddedId
    private StylingItemId id;

    @Column(name = "clothes_idx", nullable = false)
    private Long clothesIdx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    protected StylingItem() {}

    public StylingItem(Long stylingIdx, String slotKey, Long clothesIdx, Long userIdx) {
        id = new StylingItemId(stylingIdx, slotKey);
        this.clothesIdx = clothesIdx;
        this.userIdx = userIdx;
    }

    public StylingItemId getId() {
        return id;
    }

    public Long getClothesIdx() {
        return clothesIdx;
    }
}
