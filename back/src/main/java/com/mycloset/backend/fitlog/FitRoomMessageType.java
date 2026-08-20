package com.mycloset.backend.fitlog;

public enum FitRoomMessageType {
    TEXT,
    REPLY,
    EMOJI;

    public static FitRoomMessageType from(String value) {
        if (value == null || value.isBlank()) {
            return TEXT;
        }

        try {
            return valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unsupported FitLog message type");
        }
    }
}
