import React from "react";
import "./BoardPage.css";
import Modal from "../components/Modal.jsx";
import ScrollTopButton from "../components/ScrollTopButton.jsx";
import {
  createPost,
  createPostComment,
  deletePost,
  deletePostComment,
  fetchPostDetail,
  fetchPosts,
  uploadPostImage,
  updatePost,
} from "../utils/posts.js";
import searchButtonImage from "../../img/search-button.png";
import postButtonImage from "../../img/post-button.png";

const boardCategories = [
  { value: "ALL", label: "전체" },
  { value: "COORDINATION", label: "코디 공유" },
  { value: "QUESTION", label: "질문" },
  { value: "REVIEW", label: "리뷰" },
  { value: "FREE", label: "자유" },
];

const categoryColorClass = {
  COORDINATION: "is-coordination",
  QUESTION: "is-question",
  REVIEW: "is-review",
  FREE: "is-free",
};

const POSTS_PER_PAGE = 8;

const emptyPostForm = {
  category: "COORDINATION",
  title: "",
  content: "",
  imageUrl: "",
};

const activityTabs = [
  { value: "posts", label: "내가 작성한 글" },
  { value: "comments", label: "내가 댓글 단 글" },
];

function getCategoryLabel(value) {
  return boardCategories.find((category) => category.value === value)?.label || value;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function getUserPostKey(user) {
  return user?.email || user?.id || user?.nickname || "";
}

function getUserDisplayName(user) {
  return user?.nickname || user?.email || "user";
}

function isPostAuthor(post, user) {
  if (!post || !user) return false;

  const userKey = getUserPostKey(user);
  return Boolean(
    (post.authorId && userKey && post.authorId === userKey) ||
    post.author === getUserDisplayName(user) ||
    post.author === user.email ||
    post.author === user.nickname
  );
}

function isAdmin(user) {
  return user?.role === "ADMIN";
}

function getPostComments(post) {
  return Array.isArray(post?.comments) ? post.comments : [];
}

function isCommentAuthor(comment, user) {
  if (!comment || !user) return false;

  const userKey = getUserPostKey(user);
  return Boolean(
    (comment.authorId && userKey && comment.authorId === userKey) ||
    comment.author === getUserDisplayName(user) ||
    comment.author === user.email ||
    comment.author === user.nickname
  );
}

function canDeleteComment(comment, user) {
  return isCommentAuthor(comment, user) || isAdmin(user);
}

function BoardRow({ post, onSelect }) {
  const commentCount = getPostComments(post).length;

  return (
    <button className="board-row" type="button" onClick={() => onSelect(post)}>
      <span className={`board-cell board-category ${categoryColorClass[post.category] || ""}`}>
        {getCategoryLabel(post.category)}
      </span>
      <span className="board-cell board-title-cell">
        <span className="board-post-title">{post.title}</span>
        {commentCount > 0 && <span className="board-comment-count">[{commentCount}]</span>}
        {post.imageUrl && <img className="board-thumb" src={post.imageUrl} alt="" />}
        <span className="board-mobile-meta">
          {post.author} · {formatDate(post.createdAt)} · 조회 {post.views}
        </span>
      </span>
      <span className="board-cell board-author">{post.author}</span>
      <span className="board-cell board-date">{formatDate(post.createdAt)}</span>
      <span className="board-cell board-views">{post.views}</span>
    </button>
  );
}

function BoardPage({ user, onLogin }) {
  const [posts, setPosts] = React.useState([]);
  const [category, setCategory] = React.useState("ALL");
  const [query, setQuery] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(POSTS_PER_PAGE);
  const [isLoadingPosts, setIsLoadingPosts] = React.useState(false);
  const [boardError, setBoardError] = React.useState("");
  const [isWriteModalOpen, setIsWriteModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyPostForm);
  const [formError, setFormError] = React.useState("");
  const [isSubmittingPost, setIsSubmittingPost] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [editingPostId, setEditingPostId] = React.useState("");
  const [selectedPost, setSelectedPost] = React.useState(null);
  const [commentText, setCommentText] = React.useState("");
  const [commentError, setCommentError] = React.useState("");
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [activityView, setActivityView] = React.useState(null);
  const [deleteTargetPost, setDeleteTargetPost] = React.useState(null);
  const [adminDeleteResult, setAdminDeleteResult] = React.useState(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState("");
  const loaderRef = React.useRef(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadPosts() {
      setIsLoadingPosts(true);
      setBoardError("");

      try {
        setPosts(await fetchPosts({ signal: controller.signal }));
      } catch (error) {
        if (error.name !== "AbortError") {
          setBoardError(error.message || "게시글을 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPosts(false);
        }
      }
    }

    loadPosts();
    return () => controller.abort();
  }, [user]);

  React.useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [category, query]);

  const filteredPosts = React.useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory = category === "ALL" || post.category === category;
      const matchesQuery =
        !trimmedQuery ||
        post.title.toLowerCase().includes(trimmedQuery) ||
        post.content.toLowerCase().includes(trimmedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, posts, query]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMorePosts = visibleCount < filteredPosts.length;
  const hasPosts = posts.length > 0;
  const selectedPostIsMine = isPostAuthor(selectedPost, user);
  const selectedPostCanDelete = selectedPostIsMine || isAdmin(user);
  const selectedPostComments = getPostComments(selectedPost);
  const myPosts = React.useMemo(() => posts.filter((post) => isPostAuthor(post, user)), [posts, user]);
  const myCommentedPosts = React.useMemo(
    () => posts.filter((post) => getPostComments(post).some((comment) => isCommentAuthor(comment, user))),
    [posts, user]
  );

  React.useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || !hasMorePosts) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + POSTS_PER_PAGE, filteredPosts.length));
        }
      },
      { rootMargin: "160px" }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [filteredPosts.length, hasMorePosts]);

  React.useEffect(() => {
    if (!toastMessage) return undefined;

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  function openWriteModal() {
    if (!user) {
      onLogin();
      return;
    }

    setForm(emptyPostForm);
    setFormError("");
    setIsWriteModalOpen(true);
  }

  function openActivityView(nextView = "posts") {
    if (!user) {
      onLogin();
      return;
    }

    setActivityView(nextView);
  }

  function closeActivityView() {
    setActivityView(null);
  }

  function openSearchModal() {
    setIsSearchModalOpen(true);
  }

  function closeSearchModal() {
    setIsSearchModalOpen(false);
  }

  function closeWriteModal() {
    setIsWriteModalOpen(false);
    setForm(emptyPostForm);
    setFormError("");
    setIsUploadingImage(false);
    setEditingPostId("");
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setFormError("JPEG, PNG, WEBP, GIF 이미지만 첨부할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFormError("이미지 파일은 15MB 이하만 첨부할 수 있습니다.");
      event.target.value = "";
      return;
    }

    setIsUploadingImage(true);
    setFormError("");

    try {
      const imageUrl = await uploadPostImage(file);
      updateForm("imageUrl", imageUrl);
    } catch (error) {
      setFormError(error.message || "이미지를 업로드하지 못했습니다. 다시 선택해 주세요.");
      event.target.value = "";
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSubmitPost(event) {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      setFormError("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    if (isUploadingImage) {
      setFormError("이미지 업로드가 끝난 뒤 저장해 주세요.");
      return;
    }

    const values = {
      category: form.category,
      title,
      content,
      imageUrl: form.imageUrl,
    };

    setIsSubmittingPost(true);
    setFormError("");

    try {
      if (editingPostId) {
        const updatedPost = await updatePost(editingPostId, values);
        setPosts((current) => current.map((post) => (post.id === editingPostId ? updatedPost : post)));
        setSelectedPost((current) => (current?.id === editingPostId ? updatedPost : current));
        closeWriteModal();
        return;
      }

      const nextPost = await createPost(values);
      setPosts((current) => [nextPost, ...current]);
      closeWriteModal();
    } catch (error) {
      setFormError(error.message || "게시글을 저장하지 못했습니다.");
    } finally {
      setIsSubmittingPost(false);
    }
  }

  async function selectPost(post) {
    if (!user) {
      onLogin();
      return;
    }

    try {
      const detailPost = await fetchPostDetail(post.id);
      setSelectedPost(detailPost);
      setPosts((current) => current.map((item) => (item.id === detailPost.id ? detailPost : item)));
    } catch (error) {
      setToastMessage(error.message || "게시글을 불러오지 못했습니다.");
    }
  }

  function closeDetailModal() {
    setSelectedPost(null);
    setCommentText("");
    setCommentError("");
  }

  function startEditingSelectedPost() {
    if (!selectedPost || !selectedPostIsMine) return;

    const postToEdit = selectedPost;
    setForm({
      category: postToEdit.category,
      title: postToEdit.title,
      content: postToEdit.content,
      imageUrl: postToEdit.imageUrl || "",
    });
    setFormError("");
    setEditingPostId(postToEdit.id);
    setSelectedPost(null);
    setIsWriteModalOpen(true);
  }

  function deleteSelectedPost() {
    if (!selectedPost || !selectedPostCanDelete) return;

    setDeleteTargetPost(selectedPost);
  }

  function closeDeleteConfirm() {
    setDeleteTargetPost(null);
  }

  async function confirmDeletePost() {
    if (!deleteTargetPost || (!isPostAuthor(deleteTargetPost, user) && !isAdmin(user))) return;

    const shouldShowAdminDeleteResult = isAdmin(user) && !isPostAuthor(deleteTargetPost, user);
    const deletedPostTitle = deleteTargetPost.title;

    try {
      await deletePost(deleteTargetPost.id);
      setPosts((current) => current.filter((post) => post.id !== deleteTargetPost.id));
      closeDeleteConfirm();
      closeDetailModal();

      if (shouldShowAdminDeleteResult) {
        setAdminDeleteResult({ title: deletedPostTitle });
      } else {
        setToastMessage("게시글이 삭제되었습니다.");
      }
    } catch (error) {
      setToastMessage(error.message || "게시글을 삭제하지 못했습니다.");
    }
  }

  async function submitComment(event) {
    event.preventDefault();

    if (!user) {
      onLogin();
      return;
    }

    if (!selectedPost) return;

    const content = commentText.trim();
    if (!content) {
      setCommentError("댓글 내용을 입력해 주세요.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentError("");

    try {
      const result = await createPostComment(selectedPost.id, content);
      const updatedPost = result.post || {
        ...selectedPost,
        comments: [...selectedPostComments, result.comment].filter(Boolean),
      };

      setPosts((current) => current.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
      setSelectedPost(updatedPost);
      setCommentText("");
    } catch (error) {
      setCommentError(error.message || "댓글을 등록하지 못했습니다.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function deleteComment(commentId) {
    if (!selectedPost) return;

    const targetComment = selectedPostComments.find((comment) => comment.id === commentId);
    if (!canDeleteComment(targetComment, user)) return;

    try {
      await deletePostComment(selectedPost.id, commentId);
      const updatedPost = {
        ...selectedPost,
        comments: selectedPostComments.filter((comment) => comment.id !== commentId),
      };

      setPosts((current) => current.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
      setSelectedPost(updatedPost);
    } catch (error) {
      setToastMessage(error.message || "댓글을 삭제하지 못했습니다.");
    }
  }

  function openPostFromActivity(post) {
    closeActivityView();
    selectPost(post);
  }

  return (
    <main className="board-main">
      <section className="board-shell" aria-labelledby="board-title">
        <div className="board-top">
          <h1 id="board-title">게시판</h1>
          <button
            className="board-more-button"
            type="button"
            aria-label="내 게시판 활동 보기"
            onClick={() => openActivityView("posts")}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>

        <div className="board-toolbar">
          <div className="board-categories" role="group" aria-label="게시글 분류">
            {boardCategories.map((item) => (
              <button
                type="button"
                key={item.value}
                className={category === item.value ? "is-active" : ""}
                aria-pressed={category === item.value}
                onClick={() => setCategory(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button className="search-button" type="button" aria-label="게시글 검색" onClick={openSearchModal}>
            <img src={searchButtonImage} alt="" />
          </button>

          <label className="board-search">
            <span className="visually-hidden">게시글 검색</span>
            <input
              type="search"
              value={query}
              placeholder="검색어를 입력하세요"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <button className="board-write-button" type="button" onClick={openWriteModal}>
            글쓰기
          </button>
        </div>

        <section className="board-list" aria-live="polite">
          <div className="board-table-head" aria-hidden="true">
            <span>분류</span>
            <span>제목</span>
            <span>작성자</span>
            <span>날짜</span>
            <span>조회</span>
          </div>

          {!hasPosts && (
            <div className="board-empty">
              <strong>
                {isLoadingPosts ? "게시글을 불러오는 중입니다." : boardError || "아직 등록된 글이 없습니다."}
              </strong>
              <p>{!isLoadingPosts && !boardError && "첫 게시글을 작성하면 이 목록에 바로 표시됩니다."}</p>
            </div>
          )}

          {hasPosts && visiblePosts.length === 0 && (
            <div className="board-empty">
              <strong>검색 결과가 없습니다.</strong>
              <p>다른 분류나 검색어로 다시 찾아보세요.</p>
            </div>
          )}

          {visiblePosts.length > 0 && (
            <div className="board-rows">
              {visiblePosts.map((post) => (
                <BoardRow post={post} key={post.id} onSelect={selectPost} />
              ))}
            </div>
          )}

          {hasMorePosts && (
            <div className="board-loader" ref={loaderRef}>
              더 많은 글을 불러오는 중입니다.
            </div>
          )}

          {hasPosts && visiblePosts.length > 0 && !hasMorePosts && (
            <p className="board-end-message">마지막 게시글까지 모두 확인했습니다.</p>
          )}
        </section>
      </section>

      <button className="post-button" type="button" aria-label="게시글 작성" onClick={openWriteModal}>
        <img src={postButtonImage} alt="" />
      </button>
      <ScrollTopButton className="board-top-button" />

      <Modal
        isOpen={isWriteModalOpen}
        titleId="board-write-title"
        className="board-write-modal"
        onClose={closeWriteModal}
        onConfirm={() => {}}
      >
        <h2 id="board-write-title">{editingPostId ? "글 수정하기" : "글쓰기"}</h2>
        <form className="board-write-form" onSubmit={handleSubmitPost}>
          <label>
            <span>분류</span>
            <select value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
              {boardCategories
                .filter((item) => item.value !== "ALL")
                .map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>제목</span>
            <input
              type="text"
              value={form.title}
              maxLength="80"
              placeholder="제목을 입력하세요"
              data-autofocus
              onChange={(event) => updateForm("title", event.target.value)}
            />
          </label>
          <label>
            <span>내용</span>
            <textarea
              value={form.content}
              placeholder="내용을 입력하세요"
              onChange={(event) => updateForm("content", event.target.value)}
            />
          </label>
          <label className="board-image-field">
            <span>이미지</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={isUploadingImage || isSubmittingPost}
              onChange={handleImageChange}
            />
          </label>
          {isUploadingImage && <p className="board-image-uploading">이미지를 업로드하는 중입니다.</p>}
          {form.imageUrl && (
            <img className="board-image-preview" src={form.imageUrl} alt="첨부 이미지 미리보기" />
          )}
          {formError && <p className="form-error">{formError}</p>}
          <div className="board-modal-actions">
            <button className="modal-cancel-button" type="button" onClick={closeWriteModal}>
              취소
            </button>
            <button className="modal-button" type="submit" disabled={isSubmittingPost || isUploadingImage}>
              {isUploadingImage
                ? "업로드 중"
                : isSubmittingPost
                  ? "저장 중"
                  : editingPostId
                    ? "수정"
                    : "등록"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isSearchModalOpen}
        titleId="board-search-title"
        className="board-search-modal"
        onClose={closeSearchModal}
        onConfirm={closeSearchModal}
      >
        <h2 id="board-search-title">게시글 검색</h2>
        <label className="board-mobile-search-field">
          <span className="visually-hidden">검색어</span>
          <input
            type="search"
            value={query}
            placeholder="검색어를 입력하세요"
            data-autofocus
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="modal-button board-search-confirm" type="button" onClick={closeSearchModal}>
          검색
        </button>
      </Modal>

      <Modal
        isOpen={Boolean(selectedPost)}
        titleId="board-detail-title"
        className="board-detail-modal"
        onClose={closeDetailModal}
        onConfirm={() => {}}
      >
        {selectedPost && (
          <>
            <span className={`board-detail-category ${categoryColorClass[selectedPost.category] || ""}`}>
              {getCategoryLabel(selectedPost.category)}
            </span>
            <h2 id="board-detail-title">{selectedPost.title}</h2>
            <dl className="board-detail-meta">
              <div>
                <dt>작성자</dt>
                <dd>{selectedPost.author}</dd>
              </div>
              <div>
                <dt>날짜</dt>
                <dd>{formatDate(selectedPost.createdAt)}</dd>
              </div>
              <div>
                <dt>조회</dt>
                <dd>{selectedPost.views}</dd>
              </div>
            </dl>
            {selectedPostCanDelete && (
              <div className="board-detail-owner-actions">
                <button className="board-detail-delete" type="button" onClick={deleteSelectedPost}>
                  삭제하기
                </button>
                {selectedPostIsMine && (
                  <button className="board-detail-edit" type="button" onClick={startEditingSelectedPost}>
                    수정하기
                  </button>
                )}
              </div>
            )}
            {selectedPost.imageUrl && (
              <img className="board-detail-image" src={selectedPost.imageUrl} alt="" />
            )}
            <p className="board-detail-content">{selectedPost.content}</p>
            <section className="board-comments" aria-labelledby="board-comments-title">
              <h3 id="board-comments-title">댓글 {selectedPostComments.length}</h3>
              {selectedPostComments.length === 0 ? (
                <p className="board-comments-empty">아직 댓글이 없습니다.</p>
              ) : (
                <div className="board-comment-list">
                  {selectedPostComments.map((comment) => (
                    <article className="board-comment" key={comment.id}>
                      <div className="board-comment-head">
                        <strong>{comment.author}</strong>
                        <span>{formatDate(comment.createdAt)}</span>
                      </div>
                      <p>{comment.content}</p>
                      {canDeleteComment(comment, user) && (
                        <button type="button" onClick={() => deleteComment(comment.id)}>
                          삭제
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
              <form className="board-comment-form" onSubmit={submitComment}>
                <label>
                  <span className="visually-hidden">댓글 작성</span>
                  <textarea
                    value={commentText}
                    placeholder={user ? "댓글을 입력하세요" : "로그인 후 댓글을 작성할 수 있습니다"}
                    disabled={!user || isSubmittingComment}
                    onChange={(event) => {
                      setCommentText(event.target.value);
                      setCommentError("");
                    }}
                  />
                </label>
                {commentError && <p className="form-error">{commentError}</p>}
                <button className="board-comment-submit" type="submit" disabled={isSubmittingComment}>
                  {isSubmittingComment ? "등록 중" : "댓글 등록"}
                </button>
              </form>
            </section>
            <button className="modal-button board-detail-close" type="button" onClick={closeDetailModal}>
              목록으로
            </button>
          </>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(activityView)}
        titleId="board-activity-title"
        className="board-activity-modal"
        onClose={closeActivityView}
        onConfirm={() => {}}
      >
        <h2 id="board-activity-title">내 게시판 활동</h2>
        <div className="board-activity-tabs" role="group" aria-label="내 활동 종류">
          {activityTabs.map((tab) => (
            <button
              type="button"
              key={tab.value}
              className={activityView === tab.value ? "is-active" : ""}
              aria-pressed={activityView === tab.value}
              onClick={() => setActivityView(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="board-activity-list">
          {(activityView === "posts" ? myPosts : myCommentedPosts).length === 0 ? (
            <p className="board-activity-empty">
              {activityView === "posts" ? "작성한 글이 없습니다." : "댓글을 단 글이 없습니다."}
            </p>
          ) : (
            (activityView === "posts" ? myPosts : myCommentedPosts).map((post) => (
              <button
                className="board-activity-item"
                type="button"
                key={post.id}
                onClick={() => openPostFromActivity(post)}
              >
                <span className={`board-activity-category ${categoryColorClass[post.category] || ""}`}>
                  {getCategoryLabel(post.category)}
                </span>
                <strong>{post.title}</strong>
                <span>
                  {formatDate(post.createdAt)} · 조회 {post.views} · 댓글 {getPostComments(post).length}
                </span>
              </button>
            ))
          )}
        </div>
        <button className="modal-button board-activity-close" type="button" onClick={closeActivityView}>
          닫기
        </button>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTargetPost)}
        titleId="board-delete-title"
        className="board-delete-modal"
        onClose={closeDeleteConfirm}
        onConfirm={confirmDeletePost}
      >
        <h2 id="board-delete-title">게시글을 삭제할까요?</h2>
        <p>삭제한 게시글은 되돌릴 수 없습니다.</p>
        <div className="board-modal-actions">
          <button className="modal-cancel-button" type="button" onClick={closeDeleteConfirm}>
            취소
          </button>
          <button className="board-confirm-delete" type="button" onClick={confirmDeletePost}>
            삭제하기
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(adminDeleteResult)}
        titleId="board-admin-delete-result-title"
        className="board-delete-modal"
        onClose={() => setAdminDeleteResult(null)}
        onConfirm={() => setAdminDeleteResult(null)}
      >
        <h2 id="board-admin-delete-result-title">삭제 완료</h2>
        <p>게시글 "{adminDeleteResult?.title}"을 삭제했습니다.</p>
        <button className="modal-button" type="button" onClick={() => setAdminDeleteResult(null)}>
          확인
        </button>
      </Modal>
      {toastMessage && (
        <div className="board-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </main>
  );
}

export default BoardPage;
