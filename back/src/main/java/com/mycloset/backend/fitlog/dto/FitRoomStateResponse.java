package com.mycloset.backend.fitlog.dto;

import java.util.List;
import java.util.Map;

public record FitRoomStateResponse(
        String profileImageUrl,
        List<FitRoomMemberResponse> members,
        FitLogSummaryResponse myLog,
        Map<String, String> reactions,
        Map<String, List<FitLogReactionResponse>> reactionDetails,
        List<FitRoomMessageResponse> messages) {}
