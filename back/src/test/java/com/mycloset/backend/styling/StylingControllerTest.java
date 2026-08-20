package com.mycloset.backend.styling;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.clothes.dto.ClothesResponse;
import com.mycloset.backend.styling.dto.StylingResponse;
import com.mycloset.backend.styling.dto.StylingSaveRequest;

@ExtendWith(MockitoExtension.class)
class StylingControllerTest {

    @Mock
    private StylingService stylingService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new StylingController(stylingService))
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void getStylingsReturnsTheAuthenticatedUsersSavedStylings() throws Exception {
        when(stylingService.findMyStylings("closet-user")).thenReturn(List.of(response()));

        mockMvc.perform(get("/api/stylings").principal(() -> "closet-user"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].stylingId").value(99))
                .andExpect(jsonPath("$[0].items.top.id").value(31));

        verify(stylingService).findMyStylings("closet-user");
    }

    @Test
    void postStylingAcceptsTheFrontendClothesObjectAndUsesItsId() throws Exception {
        when(stylingService.create(eq("closet-user"), any(StylingSaveRequest.class)))
                .thenReturn(response());
        ArgumentCaptor<StylingSaveRequest> requestCaptor = ArgumentCaptor.forClass(StylingSaveRequest.class);

        mockMvc.perform(
                        post("/api/stylings")
                                .contentType(MediaType.APPLICATION_JSON)
                                .principal(() -> "closet-user")
                                .content(
                                        """
								{
								  "name": "Campus",
								  "memo": "Warm day",
								  "items": {
								    "top": {
								      "id": 31,
								      "category": "TOP",
								      "imageUrl": "http://images.example.com/top.jpg"
								    }
								  }
								}
								"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.items.top.clothesId").value(31));

        verify(stylingService).create(eq("closet-user"), requestCaptor.capture());
        assertEquals(31L, requestCaptor.getValue().items().get("top").resolvedClothesId());
    }

    private StylingResponse response() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 24, 14, 30);
        ClothesResponse top = new ClothesResponse(
                31L,
                31L,
                "Blue shirt",
                "Blue shirt",
                "TOP",
                "SHIRT",
                List.of("BLUE"),
                "SOLID",
                List.of("SPRING"),
                List.of("CASUAL"),
                2,
                null,
                "http://images.example.com/top.jpg",
                now,
                now);
        return new StylingResponse(99L, 99L, "Campus", "Warm day", Map.of("top", top), now, now);
    }
}
