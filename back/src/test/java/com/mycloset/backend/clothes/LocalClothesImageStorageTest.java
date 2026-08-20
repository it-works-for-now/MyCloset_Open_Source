package com.mycloset.backend.clothes;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.image.LocalImageStorage;

class LocalClothesImageStorageTest {

    @TempDir
    Path tempDirectory;

    @Test
    void storesTheOriginalImageBytesInTheConfiguredDirectory() throws Exception {
        LocalClothesImageStorage storage = storage();
        byte[] imageBytes = new byte[] {1, 3, 3, 7};
        MockMultipartFile image = new MockMultipartFile("image", "shirt.png", "image/png", imageBytes);

        String imageUrl = storage.store(7L, image);
        String relativePath = imageUrl.substring("http://localhost:8080/uploads/".length());

        assertEquals("http://localhost:8080/uploads/", imageUrl.substring(0, 30));
        assertArrayEquals(imageBytes, Files.readAllBytes(tempDirectory.resolve(relativePath)));
    }

    @Test
    void rejectsFilesThatAreNotSupportedImages() {
        ApiException exception = assertThrows(ApiException.class, () -> storage()
                .store(7L, new MockMultipartFile("image", "notes.txt", "text/plain", new byte[] {1})));

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, exception.getStatus());
    }

    @Test
    void deletesOnlyFilesInsideTheConfiguredDirectory() throws Exception {
        LocalClothesImageStorage storage = storage();
        String imageUrl = storage.store(7L, new MockMultipartFile("image", "shirt.jpg", "image/jpeg", new byte[] {1}));
        Path storedFile = tempDirectory.resolve(imageUrl.substring("http://localhost:8080/uploads/".length()));

        storage.delete(imageUrl);

        assertEquals(false, Files.exists(storedFile));
    }

    private LocalClothesImageStorage storage() {
        LocalImageStorageProperties properties = new LocalImageStorageProperties();
        properties.setDirectory(tempDirectory.toString());
        return new LocalClothesImageStorage(new LocalImageStorage(properties));
    }
}
