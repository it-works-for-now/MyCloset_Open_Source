package com.mycloset.backend.clothes;

import java.security.Principal;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mycloset.backend.clothes.dto.ClothesImageUploadResponse;
import com.mycloset.backend.clothes.dto.ClothesResponse;
import com.mycloset.backend.clothes.dto.ClothesSaveRequest;

@RestController
@RequestMapping("/api/clothes")
public class ClothesController {

    private final ClothesService clothesService;

    public ClothesController(ClothesService clothesService) {
        this.clothesService = clothesService;
    }

    @GetMapping
    public List<ClothesResponse> findMyClothes(Principal principal) {
        return clothesService.findMyClothes(principal.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClothesResponse create(Principal principal, @Valid @RequestBody ClothesSaveRequest request) {
        return clothesService.create(principal.getName(), request);
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ClothesImageUploadResponse uploadImage(Principal principal, @RequestPart("image") MultipartFile image) {
        return clothesService.uploadImage(principal.getName(), image);
    }

    @PutMapping("/{clothesId}")
    public ClothesResponse update(
            Principal principal, @PathVariable Long clothesId, @Valid @RequestBody ClothesSaveRequest request) {
        return clothesService.update(principal.getName(), clothesId, request);
    }

    @DeleteMapping("/{clothesId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long clothesId) {
        clothesService.delete(principal.getName(), clothesId);
    }
}
