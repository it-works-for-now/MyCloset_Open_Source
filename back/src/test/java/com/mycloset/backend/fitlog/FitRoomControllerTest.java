package com.mycloset.backend.fitlog;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.fitlog.dto.FitImageUploadResponse;
import com.mycloset.backend.fitlog.dto.FitRoomJoinRequest;
import com.mycloset.backend.fitlog.dto.FitRoomResponse;

@ExtendWith(MockitoExtension.class)
class FitRoomControllerTest {

    @Mock
    private FitLogService fitLogService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new FitRoomController(fitLogService))
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void listsTheAuthenticatedMembersRooms() throws Exception {
        when(fitLogService.findMyRooms("closet-user")).thenReturn(List.of(roomResponse()));

        mockMvc.perform(get("/api/fit-rooms").principal(() -> "closet-user"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("invite01"))
                .andExpect(jsonPath("$[0].isFitComplete").value(false))
                .andExpect(jsonPath("$[0].isHost").value(true));

        verify(fitLogService).findMyRooms("closet-user");
    }

    @Test
    void joinsUsingTheRoomCodeSentByTheFrontend() throws Exception {
        when(fitLogService.joinRoom(eq("closet-user"), any(FitRoomJoinRequest.class)))
                .thenReturn(roomResponse());

        mockMvc.perform(post("/api/fit-rooms/join")
                        .principal(() -> "closet-user")
                        .contentType("application/json")
                        .content("{\"code\":\"invite01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(31))
                .andExpect(jsonPath("$.recentMessageAuthor").value("Test_user2"));

        verify(fitLogService).joinRoom(eq("closet-user"), any(FitRoomJoinRequest.class));
    }

    @Test
    void uploadsFitLogImagesToTheFrontendPath() throws Exception {
        when(fitLogService.storeFitLogImage(eq("closet-user"), any()))
                .thenReturn(new FitImageUploadResponse("http://localhost:8080/uploads/fit-logs/7/look.jpg"));

        mockMvc.perform(multipart("/api/fit-logs/images")
                        .file(new MockMultipartFile("image", "look.jpg", "image/jpeg", new byte[] {1, 3, 3, 7}))
                        .principal(() -> "closet-user"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").value("http://localhost:8080/uploads/fit-logs/7/look.jpg"));

        verify(fitLogService).storeFitLogImage(eq("closet-user"), any());
    }

    private FitRoomResponse roomResponse() {
        return new FitRoomResponse(
                31L,
                31L,
                "invite01",
                "Morning looks",
                "new chat",
                "Test_user2",
                false,
                4,
                "host",
                true,
                LocalDateTime.of(2026, 7, 30, 10, 0),
                LocalDateTime.of(2026, 7, 30, 10, 0));
    }
}
