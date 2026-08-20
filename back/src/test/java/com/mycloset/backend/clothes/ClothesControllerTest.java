package com.mycloset.backend.clothes;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.clothes.dto.ClothesResponse;
import com.mycloset.backend.clothes.dto.ClothesSaveRequest;

@ExtendWith(MockitoExtension.class)
class ClothesControllerTest {

    @Mock
    private ClothesService clothesService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ClothesController(clothesService))
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void getClothesReturnsOnlyTheAuthenticatedUsersClothes() throws Exception {
        when(clothesService.findMyClothes("closet-user")).thenReturn(List.of(response()));

        mockMvc.perform(get("/api/clothes").principal(() -> "closet-user"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(31))
                .andExpect(jsonPath("$[0].alias").value("출근용 네이비 셔츠"))
                .andExpect(jsonPath("$[0].colors[0]").value("NAVY"));

        verify(clothesService).findMyClothes("closet-user");
    }

    @Test
    void postClothesCreatesAClothesRecord() throws Exception {
        when(clothesService.create(eq("closet-user"), any(ClothesSaveRequest.class)))
                .thenReturn(response());

        mockMvc.perform(post("/api/clothes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .principal(() -> "closet-user")
                        .content(objectMapper.writeValueAsString(request())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.clothesId").value(31))
                .andExpect(jsonPath("$.warmthLevel").value(3));

        verify(clothesService).create(eq("closet-user"), any(ClothesSaveRequest.class));
    }

    @Test
    void postClothesImagesStoresAnImageAndReturnsItsUrl() throws Exception {
        when(clothesService.uploadImage(eq("closet-user"), any()))
                .thenReturn(new com.mycloset.backend.clothes.dto.ClothesImageUploadResponse(
                        "http://localhost:8080/uploads/clothes/7/shirt.jpg"));

        mockMvc.perform(multipart("/api/clothes/images")
                        .file(new MockMultipartFile("image", "shirt.jpg", "image/jpeg", new byte[] {1, 3, 3, 7}))
                        .principal(() -> "closet-user"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").value("http://localhost:8080/uploads/clothes/7/shirt.jpg"));

        verify(clothesService).uploadImage(eq("closet-user"), any());
    }

    @Test
    void putClothesUpdatesTheSpecifiedClothesRecord() throws Exception {
        when(clothesService.update(eq("closet-user"), eq(31L), any(ClothesSaveRequest.class)))
                .thenReturn(response());

        mockMvc.perform(put("/api/clothes/{clothesId}", 31)
                        .contentType(MediaType.APPLICATION_JSON)
                        .principal(() -> "closet-user")
                        .content(objectMapper.writeValueAsString(request())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(31));

        verify(clothesService).update(eq("closet-user"), eq(31L), any(ClothesSaveRequest.class));
    }

    @Test
    void deleteClothesDeletesTheSpecifiedClothesRecord() throws Exception {
        mockMvc.perform(delete("/api/clothes/{clothesId}", 31).principal(() -> "closet-user"))
                .andExpect(status().isNoContent());

        verify(clothesService).delete("closet-user", 31L);
    }

    private ClothesSaveRequest request() {
        return new ClothesSaveRequest(
                "출근용 네이비 셔츠",
                "TOP",
                "SHIRT",
                "SOLID",
                List.of("NAVY"),
                List.of("SPRING", "FALL"),
                List.of("CASUAL"),
                3,
                "메모",
                null);
    }

    private ClothesResponse response() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 21, 15, 30);
        return new ClothesResponse(
                31L,
                31L,
                "출근용 네이비 셔츠",
                "출근용 네이비 셔츠",
                "TOP",
                "SHIRT",
                List.of("NAVY"),
                "SOLID",
                List.of("SPRING", "FALL"),
                List.of("CASUAL"),
                3,
                "메모",
                null,
                now,
                now);
    }
}
