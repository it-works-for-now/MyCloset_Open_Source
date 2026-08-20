package com.mycloset.backend.post;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.image.ImageStorage;
import com.mycloset.backend.post.dto.PostCommentResponse;
import com.mycloset.backend.post.dto.PostCommentSaveRequest;
import com.mycloset.backend.post.dto.PostResponse;
import com.mycloset.backend.post.dto.PostSaveRequest;
import com.mycloset.backend.user.Role;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;

@Service
public class PostService {

    private static final String IMAGE_SCOPE = "posts";

    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final UserRepository userRepository;
    private final ImageStorage imageStorage;

    public PostService(
            PostRepository postRepository,
            PostCommentRepository postCommentRepository,
            UserRepository userRepository,
            ImageStorage imageStorage) {
        this.postRepository = postRepository;
        this.postCommentRepository = postCommentRepository;
        this.userRepository = userRepository;
        this.imageStorage = imageStorage;
    }

    @Transactional(readOnly = true)
    public List<PostResponse> findAll() {
        return postRepository.findAllWithCommentsOrderByCreatedAtDesc().stream()
                .map(PostResponse::from)
                .toList();
    }

    /** Opening a post counts as a view, matching how the board list shows the counter. */
    @Transactional
    public PostResponse findOneAndCountView(Long postId) {
        Post post = findPost(postId);
        postRepository.increaseViewCount(postId);
        post.increaseViewCount();
        return PostResponse.from(post);
    }

    @Transactional
    public PostResponse create(String loginId, PostSaveRequest request) {
        UserAccount user = findUser(loginId);
        Post post = new Post(
                user,
                PostCategory.from(request.category()),
                request.title().trim(),
                request.content().trim(),
                normalizeImageUrl(request.imageUrl()));
        postRepository.save(post);
        return PostResponse.from(post);
    }

    @Transactional
    public PostResponse update(String loginId, Long postId, PostSaveRequest request) {
        UserAccount user = findUser(loginId);
        Post post = findPost(postId);
        if (!post.isOwnedBy(user.getUserIdx())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "본인이 작성한 글만 수정할 수 있습니다.");
        }

        String previousImageUrl = post.getImageUrl();
        post.update(
                PostCategory.from(request.category()),
                request.title().trim(),
                request.content().trim(),
                normalizeImageUrl(request.imageUrl()));
        if (!Objects.equals(previousImageUrl, post.getImageUrl())) {
            deleteImageAfterCommit(previousImageUrl);
        }
        return PostResponse.from(post);
    }

    /** The author can delete their own post, and an administrator can delete any post. */
    @Transactional
    public void delete(String loginId, Long postId) {
        UserAccount user = findUser(loginId);
        Post post = findPost(postId);
        if (!post.isOwnedBy(user.getUserIdx()) && user.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "본인이 작성한 글만 삭제할 수 있습니다.");
        }

        String imageUrl = post.getImageUrl();
        postRepository.delete(post);
        deleteImageAfterCommit(imageUrl);
    }

    @Transactional
    public String storeImage(String loginId, MultipartFile image) {
        UserAccount user = findUser(loginId);
        return imageStorage.store(IMAGE_SCOPE, user.getUserIdx(), image);
    }

    @Transactional
    public PostCommentResponse addComment(String loginId, Long postId, PostCommentSaveRequest request) {
        UserAccount user = findUser(loginId);
        Post post = findPost(postId);
        PostComment comment = new PostComment(post, user, request.content().trim());
        postCommentRepository.save(comment);
        return PostCommentResponse.from(comment);
    }

    @Transactional
    public void deleteComment(String loginId, Long postId, Long commentId) {
        UserAccount user = findUser(loginId);
        PostComment comment = postCommentRepository
                .findByCommentIdxAndPost_PostIdx(commentId, postId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));
        if (!comment.isOwnedBy(user.getUserIdx()) && user.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "본인이 작성한 댓글만 삭제할 수 있습니다.");
        }

        postCommentRepository.delete(comment);
    }

    private Post findPost(Long postId) {
        return postRepository
                .findByIdWithComments(postId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));
    }

    private UserAccount findUser(String loginId) {
        return userRepository
                .findByLoginId(loginId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    /** Mirrors the clothes rule: only absolute http(s) URLs are stored, never Base64 data URLs. */
    private String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        String value = imageUrl.trim();
        if (value.regionMatches(true, 0, "data:", 0, 5)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 Data URL은 저장할 수 없습니다. 이미지 업로드 API를 사용해주세요.");
        }

        try {
            URI uri = new URI(value);
            if (uri.getHost() == null
                    || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 URL 형식이 올바르지 않습니다.");
            }
            return value;
        } catch (URISyntaxException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 URL 형식이 올바르지 않습니다.");
        }
    }

    private void deleteImageAfterCommit(String imageUrl) {
        if (imageUrl == null) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            imageStorage.delete(imageUrl);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                imageStorage.delete(imageUrl);
            }
        });
    }
}
