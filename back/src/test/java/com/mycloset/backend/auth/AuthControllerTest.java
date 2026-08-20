package com.mycloset.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import com.mycloset.backend.auth.dto.UpdateProfileRequest;
import com.mycloset.backend.auth.dto.UserResponse;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AuthController(authService))
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void patchMeUpdatesTheProfileUsingTheAuthenticatedAccount() throws Exception {
        when(authService.updateMe(eq("closet-user"), any(UpdateProfileRequest.class)))
                .thenReturn(new UserResponse(7L, "closet-user", "new@example.com", "new-closet", "female", "USER"));
        ArgumentCaptor<UpdateProfileRequest> requestCaptor = ArgumentCaptor.forClass(UpdateProfileRequest.class);

        mockMvc.perform(
                        patch("/api/auth/me")
                                .principal(() -> "closet-user")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
								{
								  "nickname": "new-closet",
								  "email": "new@example.com",
								  "modelGender": "female",
								  "currentPassword": "OldPassword1!",
								  "password": "NewPassword1!",
								  "passwordConfirm": "NewPassword1!"
								}
								"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("new-closet"))
                .andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.modelGender").value("female"));

        verify(authService).updateMe(eq("closet-user"), requestCaptor.capture());
        assertEquals("NewPassword1!", requestCaptor.getValue().password());
        assertEquals("female", requestCaptor.getValue().modelGender());
    }

    @Test
    void postPasswordVerifyConfirmsTheCurrentPassword() throws Exception {
        mockMvc.perform(post("/api/auth/password/verify")
                        .principal(() -> "closet-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"OldPassword1!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(true));

        verify(authService).verifyCurrentPassword("closet-user", "OldPassword1!");
    }

    @Test
    void deleteMeDeletesTheAuthenticatedAccount() throws Exception {
        mockMvc.perform(delete("/api/auth/me").principal(() -> "closet-user")).andExpect(status().isNoContent());

        verify(authService).deleteMe("closet-user");
    }
}
