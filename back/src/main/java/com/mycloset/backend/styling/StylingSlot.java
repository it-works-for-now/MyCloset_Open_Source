package com.mycloset.backend.styling;

import java.util.Set;

public enum StylingSlot {
    HAT("hat", Set.of("ACCESSORY")),
    ACCESSORY_TOP("accessoryTop", Set.of("ACCESSORY", "BAG")),
    TOP("top", Set.of("TOP", "DRESS")),
    OUTER("outer", Set.of("OUTER")),
    BOTTOM("bottom", Set.of("BOTTOM")),
    ACCESSORY_BOTTOM("accessoryBottom", Set.of("ACCESSORY", "BAG")),
    SHOES("shoes", Set.of("SHOES")),
    ACCESSORY_SHOES("accessoryShoes", Set.of("ACCESSORY", "BAG"));

    private final String key;
    private final Set<String> categories;

    StylingSlot(String key, Set<String> categories) {
        this.key = key;
        this.categories = categories;
    }

    public String getKey() {
        return key;
    }

    public boolean supportsCategory(String category) {
        return category != null && categories.contains(category.trim().toUpperCase());
    }

    public static StylingSlot fromKey(String key) {
        for (StylingSlot slot : values()) {
            if (slot.key.equals(key)) {
                return slot;
            }
        }
        return null;
    }
}
