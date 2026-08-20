package com.mycloset.backend.clothes;

import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.common.ApiException;

@org.springframework.stereotype.Component
public class AiServerClient implements AiServerGateway {

    private static final Logger log = LoggerFactory.getLogger(AiServerClient.class);

    private final RestClient restClient;
    private final RestClient dailyLookRestClient;
    private final AiServerProperties properties;
    private final ObjectMapper objectMapper;

    public AiServerClient(
            RestClient aiServerRestClient,
            RestClient aiServerDailyLookRestClient,
            AiServerProperties properties,
            ObjectMapper objectMapper) {
        this.restClient = aiServerRestClient;
        this.dailyLookRestClient = aiServerDailyLookRestClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public JsonNode analyze(byte[] imageBytes, String filename, String contentType) {
        String responseBody;
        try {
            responseBody = restClient
                    .post()
                    .uri(analysisUri())
                    .headers(this::addApiKeyHeader)
                    .body(createMultipartBody(imageBytes, filename, contentType))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            log.warn(
                    "AI garment analysis server returned status={}",
                    exception.getStatusCode().value());
            throw aiServerResponseException(exception.getStatusCode(), "옷 분석");
        } catch (RestClientException exception) {
            throw translateConnectionException(exception, "옷 분석");
        }

        return parseAndValidateResponse(responseBody);
    }

    @Override
    public JsonNode recommendDailyLook(JsonNode requestBody) {
        String responseBody;
        try {
            responseBody = dailyLookRestClient
                    .post()
                    .uri(dailyLookUri("/v1/daily-look/recommend"))
                    .headers(this::addApiKeyHeader)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(writeJson(requestBody))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            log.warn(
                    "AI daily-look recommend server returned status={} body={}",
                    exception.getStatusCode().value(),
                    exception.getResponseBodyAsString());
            throw aiServerResponseException(exception.getStatusCode(), "코디 추천");
        } catch (RestClientException exception) {
            throw translateConnectionException(exception, "코디 추천");
        }

        try {
            return objectMapper.readTree(responseBody);
        } catch (JsonProcessingException exception) {
            log.warn("AI daily-look recommend server returned invalid JSON", exception);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI 추천 서버 응답 형식이 올바르지 않습니다.");
        }
    }

    @Override
    public byte[] generateDailyLookImage(JsonNode requestBody) {
        try {
            return dailyLookRestClient
                    .post()
                    .uri(dailyLookUri("/v1/daily-look/image"))
                    .headers(this::addApiKeyHeader)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(writeJson(requestBody))
                    .retrieve()
                    .body(byte[].class);
        } catch (RestClientResponseException exception) {
            log.warn(
                    "AI daily-look image server returned status={}",
                    exception.getStatusCode().value());
            throw aiServerResponseException(exception.getStatusCode(), "이미지 생성");
        } catch (RestClientException exception) {
            throw translateConnectionException(exception, "이미지 생성");
        }
    }

    private ApiException translateConnectionException(RestClientException exception, String action) {
        if (isTimeout(exception)) {
            log.warn("AI {} server request timed out", action, exception);
            return new ApiException(HttpStatus.GATEWAY_TIMEOUT, "AI " + action + " 서버 응답 시간이 초과했습니다.");
        }
        if (exception instanceof ResourceAccessException) {
            log.warn("AI {} server connection failed", action, exception);
            return new ApiException(HttpStatus.BAD_GATEWAY, "AI " + action + " 서버에 연결할 수 없습니다.");
        }
        log.warn("AI {} server request failed", action, exception);
        return new ApiException(HttpStatus.BAD_GATEWAY, "AI " + action + " 서버 요청을 처리할 수 없습니다.");
    }

    private String writeJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize an already-built JsonNode.", exception);
        }
    }

    private URI dailyLookUri(String path) {
        return UriComponentsBuilder.fromUriString(properties.getDailyLookBaseUrl())
                .path(path)
                .build()
                .toUri();
    }

    private URI analysisUri() {
        return UriComponentsBuilder.fromUriString(properties.getBaseUrl())
                .path("/v1/garment-analysis")
                .build()
                .toUri();
    }

    private void addApiKeyHeader(HttpHeaders headers) {
        if (StringUtils.hasText(properties.getApiKey())) {
            headers.set("X-API-Key", properties.getApiKey());
        }
    }

    private MultiValueMap<String, Object> createMultipartBody(byte[] imageBytes, String filename, String contentType) {
        ByteArrayResource imageResource = new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType(contentType));
        partHeaders.setContentDisposition(ContentDisposition.formData()
                .name("image")
                .filename(filename, StandardCharsets.UTF_8)
                .build());

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", new HttpEntity<>(imageResource, partHeaders));
        return body;
    }

    private JsonNode parseAndValidateResponse(String responseBody) {
        try {
            JsonNode response = objectMapper.readTree(responseBody);
            if (!matchesContract(response)) {
                log.warn("AI garment analysis server returned a response outside the expected contract");
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI 분석 서버 응답 형식이 올바르지 않습니다.");
            }
            return response;
        } catch (JsonProcessingException exception) {
            log.warn("AI garment analysis server returned invalid JSON", exception);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI 분석 서버 응답 형식이 올바르지 않습니다.");
        }
    }

    private boolean matchesContract(JsonNode response) {
        if (response == null
                || !response.isObject()
                || !hasText(response, "model")
                || !response.path("processingMs").isNumber()
                || !response.path("requiresReview").isBoolean()) {
            return false;
        }

        JsonNode attributes = response.path("attributes");
        return attributes.isObject()
                && isTextOrNull(attributes.path("category"))
                && isTextOrNull(attributes.path("subcategory"))
                && isTextArray(attributes.path("colors"))
                && isTextOrNull(attributes.path("pattern"))
                && isTextArray(attributes.path("seasons"))
                && isTextArray(attributes.path("styleTags"))
                && isWarmthLevelOrNull(attributes.path("warmthLevel"))
                && hasText(attributes, "memo")
                && isTextArray(attributes.path("uncertainFields"));
    }

    private boolean hasText(JsonNode parent, String fieldName) {
        return parent.path(fieldName).isTextual();
    }

    private boolean isTextOrNull(JsonNode node) {
        return node.isTextual() || node.isNull();
    }

    private boolean isWarmthLevelOrNull(JsonNode node) {
        return node.isNull()
                || (node.isIntegralNumber() && node.canConvertToInt() && node.intValue() >= 1 && node.intValue() <= 5);
    }

    private boolean isTextArray(JsonNode node) {
        if (!node.isArray()) {
            return false;
        }
        for (JsonNode value : node) {
            if (!value.isTextual()) {
                return false;
            }
        }
        return true;
    }

    private ApiException aiServerResponseException(HttpStatusCode status, String action) {
        if (status.is4xxClientError()) {
            return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "AI " + action + " 요청을 처리할 수 없습니다.");
        }
        return new ApiException(HttpStatus.BAD_GATEWAY, "AI " + action + " 서버에서 오류가 발생했습니다.");
    }

    private boolean isTimeout(Throwable exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof SocketTimeoutException || current instanceof HttpTimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
