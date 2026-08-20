package com.mycloset.backend.post;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.image.ImageStorage;
import com.mycloset.backend.post.dto.PostCommentSaveRequest;
import com.mycloset.backend.post.dto.PostResponse;
import com.mycloset.backend.post.dto.PostSaveRequest;
import com.mycloset.backend.user.Role;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    private static final String IMAGE_URL = "http://localhost:8080/uploads/posts/7/photo.png";

    @Mock
    private PostRepository postRepository;

    @Mock
    private PostCommentRepository postCommentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ImageStorage imageStorage;

    private PostService postService;
    private UserAccount author;
    private UserAccount otherUser;
    private UserAccount admin;

    @BeforeEach
    void setUp() {
        postService = new PostService(postRepository, postCommentRepository, userRepository, imageStorage);
        author = user(7L, "author", Role.USER);
        otherUser = user(8L, "other", Role.USER);
        admin = user(9L, "admin", Role.ADMIN);
        lenient().when(userRepository.findByLoginId("author")).thenReturn(Optional.of(author));
        lenient().when(userRepository.findByLoginId("other")).thenReturn(Optional.of(otherUser));
        lenient().when(userRepository.findByLoginId("admin")).thenReturn(Optional.of(admin));
    }

    @Test
    void createsAPostWithTrimmedTextAndTheAuthorNickname() {
        PostResponse response = postService.create("author", new PostSaveRequest(null, "  제목  ", "  본문  ", IMAGE_URL));

        assertEquals("제목", response.title());
        assertEquals("본문", response.content());
        assertEquals(IMAGE_URL, response.imageUrl());
        assertEquals("author", response.author());
        assertEquals(0, response.views());
        verify(postRepository).save(any(Post.class));
    }

    @Test
    void storesTheCategoryTheBoardTabSends() {
        PostResponse response = postService.create("author", new PostSaveRequest("QUESTION", "제목", "본문", null));

        assertEquals("QUESTION", response.category());
    }

    @Test
    void fallsBackToFreeWhenNoCategoryIsSent() {
        PostResponse response = postService.create("author", new PostSaveRequest(null, "제목", "본문", null));

        assertEquals("FREE", response.category());
    }

    @Test
    void rejectsACategoryThatIsNotOnTheBoard() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> postService.create("author", new PostSaveRequest("NOTICE", "제목", "본문", null)));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void updatesTheCategoryToo() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        PostResponse response = postService.update("author", 31L, new PostSaveRequest("REVIEW", "제목", "본문", IMAGE_URL));

        assertEquals("REVIEW", response.category());
    }

    @Test
    void storesNoImageWhenTheRequestLeavesItEmpty() {
        PostResponse response = postService.create("author", new PostSaveRequest(null, "제목", "본문", "   "));

        assertNull(response.imageUrl());
    }

    @Test
    void rejectsABase64DataUrlSoImagesNeverLandInTheDatabase() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> postService.create(
                        "author", new PostSaveRequest(null, "제목", "본문", "data:image/png;base64,iVBORw0KGgo=")));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void rejectsAnImageUrlThatIsNotAbsolute() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> postService.create(
                        "author", new PostSaveRequest(null, "제목", "본문", "/uploads/posts/7/photo.png")));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void countsAViewWhenThePostIsOpened() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        PostResponse response = postService.findOneAndCountView(31L);

        assertEquals(1, response.views());
        verify(postRepository).increaseViewCount(31L);
    }

    @Test
    void letsTheAuthorUpdateTheirOwnPost() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        PostResponse response = postService.update("author", 31L, new PostSaveRequest(null, "새 제목", "새 본문", null));

        assertEquals("새 제목", response.title());
        assertNull(response.imageUrl());
        verify(imageStorage).delete(IMAGE_URL);
    }

    @Test
    void rejectsAnUpdateFromSomeoneElse() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        ApiException exception = assertThrows(
                ApiException.class,
                () -> postService.update("other", 31L, new PostSaveRequest(null, "제목", "본문", null)));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
    }

    @Test
    void rejectsAnUpdateEvenFromAnAdministrator() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        ApiException exception = assertThrows(
                ApiException.class,
                () -> postService.update("admin", 31L, new PostSaveRequest(null, "제목", "본문", null)));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
    }

    @Test
    void letsTheAuthorDeleteTheirOwnPostAndCleansUpTheImage() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        postService.delete("author", 31L);

        verify(postRepository).delete(post);
        verify(imageStorage).delete(IMAGE_URL);
    }

    @Test
    void letsAnAdministratorDeleteAnyPost() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        postService.delete("admin", 31L);

        verify(postRepository).delete(post);
    }

    @Test
    void rejectsADeleteFromAnotherMember() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        ApiException exception = assertThrows(ApiException.class, () -> postService.delete("other", 31L));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
        verify(postRepository, never()).delete(post);
    }

    @Test
    void returnsNotFoundForAMissingPost() {
        when(postRepository.findByIdWithComments(999L)).thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class, () -> postService.findOneAndCountView(999L));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
    }

    @Test
    void addsACommentToAPost() {
        Post post = post(31L, author);
        when(postRepository.findByIdWithComments(31L)).thenReturn(Optional.of(post));

        postService.addComment("other", 31L, new PostCommentSaveRequest("  좋아요  "));

        verify(postCommentRepository).save(any(PostComment.class));
    }

    @Test
    void rejectsDeletingSomeoneElsesComment() {
        PostComment comment = new PostComment(post(31L, author), author, "내 댓글");
        when(postCommentRepository.findByCommentIdxAndPost_PostIdx(5L, 31L)).thenReturn(Optional.of(comment));

        ApiException exception = assertThrows(ApiException.class, () -> postService.deleteComment("other", 31L, 5L));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
        verify(postCommentRepository, never()).delete(comment);
    }

    @Test
    void letsAnAdministratorDeleteAnyComment() {
        PostComment comment = new PostComment(post(31L, author), author, "내 댓글");
        when(postCommentRepository.findByCommentIdxAndPost_PostIdx(5L, 31L)).thenReturn(Optional.of(comment));

        postService.deleteComment("admin", 31L, 5L);

        verify(postCommentRepository).delete(comment);
    }

    private Post post(Long postIdx, UserAccount owner) {
        Post post = new Post(owner, PostCategory.FREE, "제목", "본문", IMAGE_URL);
        ReflectionTestUtils.setField(post, "postIdx", postIdx);
        return post;
    }

    private UserAccount user(Long userIdx, String loginId, Role role) {
        UserAccount account = new UserAccount(loginId, "encoded-password", loginId, loginId + "@example.com");
        ReflectionTestUtils.setField(account, "userIdx", userIdx);
        ReflectionTestUtils.setField(account, "role", role);
        return account;
    }
}
