package com.mycloset.backend.post;

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

import com.mycloset.backend.post.dto.PostCommentResponse;
import com.mycloset.backend.post.dto.PostCommentSaveRequest;
import com.mycloset.backend.post.dto.PostImageUploadResponse;
import com.mycloset.backend.post.dto.PostResponse;
import com.mycloset.backend.post.dto.PostSaveRequest;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public List<PostResponse> list() {
        return postService.findAll();
    }

    @GetMapping("/{postId}")
    public PostResponse detail(@PathVariable Long postId) {
        return postService.findOneAndCountView(postId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(Principal principal, @Valid @RequestBody PostSaveRequest request) {
        return postService.create(principal.getName(), request);
    }

    @PutMapping("/{postId}")
    public PostResponse update(
            Principal principal, @PathVariable Long postId, @Valid @RequestBody PostSaveRequest request) {
        return postService.update(principal.getName(), postId, request);
    }

    @DeleteMapping("/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long postId) {
        postService.delete(principal.getName(), postId);
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PostImageUploadResponse uploadImage(
            Principal principal, @RequestPart(value = "image", required = false) MultipartFile image) {
        return new PostImageUploadResponse(postService.storeImage(principal.getName(), image));
    }

    @PostMapping("/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public PostCommentResponse addComment(
            Principal principal, @PathVariable Long postId, @Valid @RequestBody PostCommentSaveRequest request) {
        return postService.addComment(principal.getName(), postId, request);
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(Principal principal, @PathVariable Long postId, @PathVariable Long commentId) {
        postService.deleteComment(principal.getName(), postId, commentId);
    }
}
