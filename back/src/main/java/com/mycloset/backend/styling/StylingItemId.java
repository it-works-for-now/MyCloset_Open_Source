package com.mycloset.backend.styling;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class StylingItemId implements Serializable {

    @Column(name = "styling_idx")
    private Long stylingIdx;

    @Column(name = "slot_key", length = 30)
    private String slotKey;

    protected StylingItemId() {}

    public StylingItemId(Long stylingIdx, String slotKey) {
        this.stylingIdx = stylingIdx;
        this.slotKey = slotKey;
    }

    public Long getStylingIdx() {
        return stylingIdx;
    }

    public String getSlotKey() {
        return slotKey;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof StylingItemId that)) {
            return false;
        }
        return Objects.equals(stylingIdx, that.stylingIdx) && Objects.equals(slotKey, that.slotKey);
    }

    @Override
    public int hashCode() {
        return Objects.hash(stylingIdx, slotKey);
    }
}
