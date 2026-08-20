package com.mycloset.backend.clothes;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.common.GlobalExceptionHandler;

class GarmentAnalysisControllerTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void postAnalyzeReturnsTheAiResponseAsReceived() throws Exception {
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
        MockMvc mockMvc = mockMvc(gateway);
        byte[] imageBytes = new byte[] {1, 3, 3, 7};
        MockMultipartFile image = new MockMultipartFile("image", "shirt.png", "image/png", imageBytes);

        mockMvc.perform(multipart("/api/clothes/analyze").file(image))
                .andExpect(status().isOk())
                .andExpect(content().json(expectedResponse.toString()));

        assertArrayEquals(imageBytes, gateway.imageBytes);
    }

    @Test
    void postAnalyzeWithoutImageReturnsBadRequest() throws Exception {
        MockMvc mockMvc = mockMvc(new RecordingGateway(null));

        mockMvc.perform(multipart("/api/clothes/analyze")).andExpect(status().isBadRequest());
    }

    private MockMvc mockMvc(RecordingGateway gateway) {
        GarmentAnalysisService service = new GarmentAnalysisService(gateway);
        return MockMvcBuilders.standaloneSetup(new GarmentAnalysisController(service))
                .setMessageConverters(
                        new ByteArrayHttpMessageConverter(), new MappingJackson2HttpMessageConverter(objectMapper))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static final class RecordingGateway implements AiServerGateway {

        private final JsonNode response;
        private byte[] imageBytes;

        private RecordingGateway(JsonNode response) {
            this.response = response;
        }

        @Override
        public JsonNode analyze(byte[] imageBytes, String filename, String contentType) {
            this.imageBytes = imageBytes;
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
