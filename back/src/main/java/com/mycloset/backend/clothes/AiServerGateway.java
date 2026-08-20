package com.mycloset.backend.clothes;

import com.fasterxml.jackson.databind.JsonNode;

public interface AiServerGateway {

    JsonNode analyze(byte[] imageBytes, String filename, String contentType);

    JsonNode recommendDailyLook(JsonNode requestBody);

    byte[] generateDailyLookImage(JsonNode requestBody);
}
