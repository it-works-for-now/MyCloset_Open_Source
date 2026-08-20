package com.mycloset.backend.clothes;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.common.ApiException;

class GarmentAnalysisServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void returnsAiResponseWithoutChangingItAndPassesOriginalImageBytes() throws Exception {
        JsonNode expectedResponse = objectMapper.readTree(
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
				""");
        RecordingGateway gateway = new RecordingGateway(expectedResponse);
        GarmentAnalysisService service = new GarmentAnalysisService(gateway);
        byte[] imageBytes = new byte[] {0, 1, 2, 3, 4, 5};
        MockMultipartFile image = new MockMultipartFile("image", "blue-shirt.png", "image/png", imageBytes);

        JsonNode actualResponse = service.analyze(image);

        assertEquals(expectedResponse, actualResponse);
        assertArrayEquals(imageBytes, gateway.imageBytes);
        assertEquals("blue-shirt.png", gateway.filename);
        assertEquals("image/png", gateway.contentType);
    }

    @Test
    void rejectsMissingImage() {
        GarmentAnalysisService service = new GarmentAnalysisService(new RecordingGateway(null));

        ApiException exception = assertThrows(ApiException.class, () -> service.analyze(null));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void rejectsEmptyImage() {
        GarmentAnalysisService service = new GarmentAnalysisService(new RecordingGateway(null));
        MockMultipartFile image = new MockMultipartFile("image", "empty.png", "image/png", new byte[0]);

        ApiException exception = assertThrows(ApiException.class, () -> service.analyze(image));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void rejectsNonImageFile() {
        GarmentAnalysisService service = new GarmentAnalysisService(new RecordingGateway(null));
        MockMultipartFile file = new MockMultipartFile("image", "notes.txt", "text/plain", "text".getBytes());

        ApiException exception = assertThrows(ApiException.class, () -> service.analyze(file));

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, exception.getStatus());
    }

    @Test
    void rejectsImageLargerThan15MiB() {
        GarmentAnalysisService service = new GarmentAnalysisService(new RecordingGateway(null));
        byte[] oversizedImage = new byte[(15 * 1024 * 1024) + 1];
        MockMultipartFile image = new MockMultipartFile("image", "large.jpg", "image/jpeg", oversizedImage);

        ApiException exception = assertThrows(ApiException.class, () -> service.analyze(image));

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, exception.getStatus());
    }

    private static final class RecordingGateway implements AiServerGateway {

        private final JsonNode response;
        private byte[] imageBytes;
        private String filename;
        private String contentType;

        private RecordingGateway(JsonNode response) {
            this.response = response;
        }

        @Override
        public JsonNode analyze(byte[] imageBytes, String filename, String contentType) {
            this.imageBytes = imageBytes;
            this.filename = filename;
            this.contentType = contentType;
            return response;
        }

        @Override
        public JsonNode recommendDailyLook(JsonNode requestBody) {
            throw new UnsupportedOperationException("Not used by this test.");
        }

        @Override
        public byte[] generateDailyLookImage(JsonNode requestBody) {
            throw new UnsupportedOperationException("Not used by this test.");
        }
    }
}
