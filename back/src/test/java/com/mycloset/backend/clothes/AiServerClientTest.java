package com.mycloset.backend.clothes;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.common.ApiException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

class AiServerClientTest {

    private static final String VALID_RESPONSE =
            """
			{
			  "model": "Qwen/Qwen2.5-VL-3B-Instruct",
			  "processingMs": 8200,
			  "attributes": {
			    "category": "TOP",
			    "subcategory": "SHIRT",
			    "colors": ["BLUE"],
			    "pattern": "SOLID",
			    "seasons": ["SPRING", "SUMMER"],
			    "styleTags": ["CASUAL"],
			    "warmthLevel": 2,
			    "memo": "",
			    "uncertainFields": []
			  },
			  "requiresReview": false
			}
			""";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void forwardsOriginalBytesFilenameAndMimeTypeAsMultipartAndReturnsSameJson() throws Exception {
        AtomicReference<CapturedRequest> capturedRequest = new AtomicReference<>();
        server.createContext("/v1/garment-analysis", exchange -> {
            capturedRequest.set(capture(exchange));
            writeJson(exchange, 200, VALID_RESPONSE);
        });
        server.start();

        AiServerClient client = client(serverBaseUrl(), "test-api-key", 2);
        byte[] originalImage = new byte[] {0, 1, 2, 13, 10, 3, 4, 5};

        JsonNode response = client.analyze(originalImage, "blue-shirt.png", "image/png");

        CapturedRequest request = capturedRequest.get();
        assertEquals(objectMapper.readTree(VALID_RESPONSE), response);
        assertEquals("test-api-key", request.apiKey());
        assertTrue(request.contentType().startsWith(MediaType.MULTIPART_FORM_DATA_VALUE));
        assertTrue(request.partHeaders().contains("name=\"image\""));
        assertTrue(request.partHeaders().contains("blue-shirt.png"));
        assertTrue(request.partHeaders().contains("Content-Type: image/png"));
        assertArrayEquals(originalImage, request.imageBytes());
    }

    @Test
    void sendsDailyLookRequestsToDedicatedBaseUrl() throws Exception {
        AtomicReference<String> requestBody = new AtomicReference<>();
        server.createContext("/v1/daily-look/recommend", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            writeJson(exchange, 200, "{\"recommendations\":[]}");
        });
        server.start();

        AiServerClient client = client("http://127.0.0.1:1", serverBaseUrl(), "", 2);
        JsonNode response =
                client.recommendDailyLook(objectMapper.createObjectNode().put("situation", "rain"));

        assertTrue(response.path("recommendations").isArray());
        assertEquals(
                "rain",
                objectMapper.readTree(requestBody.get()).path("situation").asText());
    }

    @Test
    void acceptsNullCategory() {
        JsonNode response =
                analyzeSuccessfulResponse(VALID_RESPONSE.replace("\"category\": \"TOP\"", "\"category\": null"));

        assertTrue(response.path("attributes").path("category").isNull());
    }

    @Test
    void acceptsNullSubcategory() {
        JsonNode response = analyzeSuccessfulResponse(
                VALID_RESPONSE.replace("\"subcategory\": \"SHIRT\"", "\"subcategory\": null"));

        assertTrue(response.path("attributes").path("subcategory").isNull());
    }

    @Test
    void acceptsNullPattern() {
        JsonNode response =
                analyzeSuccessfulResponse(VALID_RESPONSE.replace("\"pattern\": \"SOLID\"", "\"pattern\": null"));

        assertTrue(response.path("attributes").path("pattern").isNull());
    }

    @Test
    void acceptsNullWarmthLevel() {
        JsonNode response =
                analyzeSuccessfulResponse(VALID_RESPONSE.replace("\"warmthLevel\": 2", "\"warmthLevel\": null"));

        assertTrue(response.path("attributes").path("warmthLevel").isNull());
    }

    @Test
    void acceptsMultipleNullableFieldsWithReviewMetadata() {
        String nullableResponse = VALID_RESPONSE
                .replace("\"category\": \"TOP\"", "\"category\": null")
                .replace("\"subcategory\": \"SHIRT\"", "\"subcategory\": null")
                .replace("\"pattern\": \"SOLID\"", "\"pattern\": null")
                .replace("\"warmthLevel\": 2", "\"warmthLevel\": null")
                .replace(
                        "\"uncertainFields\": []",
                        "\"uncertainFields\": [\"category\", \"subcategory\", \"pattern\", \"warmthLevel\"]")
                .replace("\"requiresReview\": false", "\"requiresReview\": true");

        JsonNode response = analyzeSuccessfulResponse(nullableResponse);

        assertTrue(response.path("requiresReview").booleanValue());
        assertEquals(4, response.path("attributes").path("uncertainFields").size());
        assertTrue(response.path("attributes").path("category").isNull());
        assertTrue(response.path("attributes").path("warmthLevel").isNull());
    }

    @Test
    void omitsApiKeyHeaderWhenItIsBlank() {
        AtomicReference<CapturedRequest> capturedRequest = new AtomicReference<>();
        server.createContext("/v1/garment-analysis", exchange -> {
            capturedRequest.set(capture(exchange));
            writeJson(exchange, 200, VALID_RESPONSE);
        });
        server.start();

        client(serverBaseUrl(), "", 2).analyze(new byte[] {1}, "shirt.png", "image/png");

        assertNull(capturedRequest.get().apiKey());
    }

    @Test
    void mapsAiServerConnectionFailureToBadGateway() throws Exception {
        int unusedPort;
        try (ServerSocket socket = new ServerSocket(0)) {
            unusedPort = socket.getLocalPort();
        }
        AiServerClient client = client("http://127.0.0.1:" + unusedPort, "", 1);

        ApiException exception =
                assertThrows(ApiException.class, () -> client.analyze(new byte[] {1}, "shirt.png", "image/png"));

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatus());
    }

    @Test
    void mapsAiServerTimeoutToGatewayTimeout() {
        server.createContext("/v1/garment-analysis", exchange -> {
            try {
                Thread.sleep(1500);
                writeJson(exchange, 200, VALID_RESPONSE);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            } catch (IOException ignored) {
                // The client has already timed out and closed the connection.
            }
        });
        server.start();
        AiServerClient client = client(serverBaseUrl(), "", 1);

        ApiException exception =
                assertThrows(ApiException.class, () -> client.analyze(new byte[] {1}, "shirt.png", "image/png"));

        assertEquals(HttpStatus.GATEWAY_TIMEOUT, exception.getStatus());
    }

    @Test
    void mapsAiServerFiveHundredResponseToBadGateway() {
        server.createContext("/v1/garment-analysis", exchange -> writeJson(exchange, 500, "{\"error\":\"failure\"}"));
        server.start();
        AiServerClient client = client(serverBaseUrl(), "", 2);

        ApiException exception =
                assertThrows(ApiException.class, () -> client.analyze(new byte[] {1}, "shirt.png", "image/png"));

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatus());
    }

    @Test
    void mapsInvalidAiResponseContractToBadGateway() {
        assertContractRejected("{\"model\":\"missing-required-fields\"}");
    }

    @Test
    void rejectsNumericCategory() {
        assertContractRejected(VALID_RESPONSE.replace("\"category\": \"TOP\"", "\"category\": 1"));
    }

    @Test
    void rejectsArrayPattern() {
        assertContractRejected(VALID_RESPONSE.replace("\"pattern\": \"SOLID\"", "\"pattern\": [\"SOLID\"]"));
    }

    @Test
    void rejectsStringWarmthLevel() {
        assertContractRejected(VALID_RESPONSE.replace("\"warmthLevel\": 2", "\"warmthLevel\": \"2\""));
    }

    @Test
    void rejectsWarmthLevelOutsideOneToFive() {
        AtomicReference<String> responseBody = new AtomicReference<>();
        server.createContext("/v1/garment-analysis", exchange -> writeJson(exchange, 200, responseBody.get()));
        server.start();
        AiServerClient client = client(serverBaseUrl(), "", 2);

        for (int invalidWarmthLevel : List.of(0, 6)) {
            responseBody.set(VALID_RESPONSE.replace("\"warmthLevel\": 2", "\"warmthLevel\": " + invalidWarmthLevel));
            assertBadGateway(client);
        }
    }

    @Test
    void rejectsNonTextArrayFields() {
        AtomicReference<String> responseBody = new AtomicReference<>();
        server.createContext("/v1/garment-analysis", exchange -> writeJson(exchange, 200, responseBody.get()));
        server.start();
        AiServerClient client = client(serverBaseUrl(), "", 2);

        for (String fieldName : List.of("colors", "seasons", "styleTags", "uncertainFields")) {
            responseBody.set(VALID_RESPONSE.replace(
                    "\"" + fieldName + "\": " + arrayValue(fieldName), "\"" + fieldName + "\": \"invalid\""));
            assertBadGateway(client);

            responseBody.set(VALID_RESPONSE.replace(
                    "\"" + fieldName + "\": " + arrayValue(fieldName), "\"" + fieldName + "\": [1]"));
            assertBadGateway(client);
        }
    }

    private AiServerClient client(String baseUrl, String apiKey, long timeoutSeconds) {
        return client(baseUrl, null, apiKey, timeoutSeconds);
    }

    private AiServerClient client(String baseUrl, String dailyLookBaseUrl, String apiKey, long timeoutSeconds) {
        AiServerProperties properties = new AiServerProperties();
        properties.setBaseUrl(baseUrl);
        properties.setDailyLookBaseUrl(dailyLookBaseUrl);
        properties.setApiKey(apiKey);
        properties.setTimeoutSeconds(timeoutSeconds);

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        RestClient restClient =
                RestClient.builder().requestFactory(requestFactory).build();
        return new AiServerClient(restClient, restClient, properties, objectMapper);
    }

    private String serverBaseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private JsonNode analyzeSuccessfulResponse(String responseBody) {
        server.createContext("/v1/garment-analysis", exchange -> writeJson(exchange, 200, responseBody));
        server.start();
        return client(serverBaseUrl(), "", 2).analyze(new byte[] {1}, "shirt.png", "image/png");
    }

    private void assertContractRejected(String responseBody) {
        server.createContext("/v1/garment-analysis", exchange -> writeJson(exchange, 200, responseBody));
        server.start();
        assertBadGateway(client(serverBaseUrl(), "", 2));
    }

    private void assertBadGateway(AiServerClient client) {
        ApiException exception =
                assertThrows(ApiException.class, () -> client.analyze(new byte[] {1}, "shirt.png", "image/png"));
        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatus());
    }

    private String arrayValue(String fieldName) {
        return switch (fieldName) {
            case "colors" -> "[\"BLUE\"]";
            case "seasons" -> "[\"SPRING\", \"SUMMER\"]";
            case "styleTags" -> "[\"CASUAL\"]";
            case "uncertainFields" -> "[]";
            default -> throw new IllegalArgumentException("Unknown array field: " + fieldName);
        };
    }

    private CapturedRequest capture(HttpExchange exchange) throws IOException {
        String contentType = exchange.getRequestHeaders().getFirst(HttpHeaders.CONTENT_TYPE);
        byte[] requestBody = exchange.getRequestBody().readAllBytes();
        String boundary = MediaType.parseMediaType(contentType).getParameter("boundary");
        int headersEnd = indexOf(requestBody, "\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1), 0);
        int bodyStart = headersEnd + 4;
        int bodyEnd = indexOf(requestBody, ("\r\n--" + boundary).getBytes(StandardCharsets.ISO_8859_1), bodyStart);
        String partHeaders = new String(requestBody, 0, headersEnd, StandardCharsets.ISO_8859_1);
        byte[] imageBytes = java.util.Arrays.copyOfRange(requestBody, bodyStart, bodyEnd);

        return new CapturedRequest(
                contentType, exchange.getRequestHeaders().getFirst("X-API-Key"), partHeaders, imageBytes);
    }

    private int indexOf(byte[] source, byte[] target, int fromIndex) {
        for (int sourceIndex = fromIndex; sourceIndex <= source.length - target.length; sourceIndex++) {
            boolean matches = true;
            for (int targetIndex = 0; targetIndex < target.length; targetIndex++) {
                if (source[sourceIndex + targetIndex] != target[targetIndex]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                return sourceIndex;
            }
        }
        throw new AssertionError("Expected multipart delimiter was not found");
    }

    private void writeJson(HttpExchange exchange, int status, String body) throws IOException {
        byte[] responseBytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        exchange.sendResponseHeaders(status, responseBytes.length);
        exchange.getResponseBody().write(responseBytes);
        exchange.close();
    }

    private record CapturedRequest(String contentType, String apiKey, String partHeaders, byte[] imageBytes) {}
}
