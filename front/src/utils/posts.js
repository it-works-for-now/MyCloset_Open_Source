import { getToken } from "./auth.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function createRequestError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getAuthHeaders() {
  const token = getToken();
  if (!token) {
    throw createRequestError("로그인이 필요합니다. 다시 로그인해 주세요.", 401);
  }

  return { Authorization: `Bearer ${token}` };
}

async function getErrorMessage(response) {
  if (response.status === 401) return "로그인이 만료되었거나 인증이 필요합니다. 다시 로그인해 주세요.";
  if (response.status === 403) return "게시글을 처리할 권한이 없습니다.";
  if (response.status === 413) return "이미지 파일은 15MB 이하만 업로드할 수 있어요.";
  if (response.status === 415) return "JPEG, PNG, WEBP, GIF 이미지만 업로드할 수 있어요.";

  try {
    const body = await response.json();
    return body.message || body.detail || "게시글을 처리하지 못했습니다. 다시 시도해 주세요.";
  } catch {
    return "게시글을 처리하지 못했습니다. 다시 시도해 주세요.";
  }
}

async function request(endpoint, { method = "GET", body, signal } = {}) {
  const headers = getAuthHeaders();
  const hasJsonBody = body !== undefined;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: hasJsonBody ? { ...headers, "Content-Type": "application/json" } : headers,
      body: hasJsonBody ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) throw createRequestError(await getErrorMessage(response), response.status);
    if (response.status === 204) return undefined;
    return response.json();
  } catch (error) {
    if (error.name === "AbortError" || error.status) throw error;
    throw createRequestError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function publicRequest(endpoint, { signal } = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { signal });

    if (!response.ok) throw createRequestError(await getErrorMessage(response), response.status);
    if (response.status === 204) return undefined;
    return response.json();
  } catch (error) {
    if (error.name === "AbortError" || error.status) throw error;
    throw createRequestError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function getPostId(post, fallback) {
  return post?.id ?? post?.postId ?? fallback;
}

function normalizeComment(comment, index = 0) {
  if (!comment) return null;

  const id = comment.id ?? comment.commentId ?? index;

  return {
    ...comment,
    id,
    commentId: comment.commentId ?? id,
    content: comment.content || "",
    author: comment.author || "",
    createdAt: comment.createdAt || "",
  };
}

export function normalizePost(post, index = 0) {
  if (!post) return null;

  const id = getPostId(post, index);

  return {
    ...post,
    id,
    postId: post.postId ?? id,
    category: post.category || "FREE",
    title: post.title || "",
    content: post.content || "",
    imageUrl: post.imageUrl || "",
    author: post.author || "",
    views: Number(post.views) || 0,
    comments: Array.isArray(post.comments) ? post.comments.map(normalizeComment).filter(Boolean) : [],
    createdAt: post.createdAt || "",
    updatedAt: post.updatedAt || "",
  };
}

export function normalizePosts(data) {
  const posts = Array.isArray(data) ? data : data?.posts || data?.content || data?.items || [];
  return posts.map(normalizePost).filter(Boolean);
}

function toSavePayload(values) {
  return {
    category: values.category || "FREE",
    title: String(values.title || "").trim(),
    content: String(values.content || "").trim(),
    imageUrl: values.imageUrl || null,
  };
}

export async function fetchPosts({ signal } = {}) {
  return normalizePosts(await publicRequest("/posts", { signal }));
}

export async function fetchPostDetail(postId, { signal } = {}) {
  const response = await request(`/posts/${encodeURIComponent(postId)}`, { signal });
  return normalizePost(response);
}

export async function createPost(values, { signal } = {}) {
  const response = await request("/posts", {
    method: "POST",
    body: toSavePayload(values),
    signal,
  });
  return normalizePost(response);
}

export async function updatePost(postId, values, { signal } = {}) {
  const response = await request(`/posts/${encodeURIComponent(postId)}`, {
    method: "PUT",
    body: toSavePayload(values),
    signal,
  });
  return normalizePost(response);
}

export async function uploadPostImage(file, { signal } = {}) {
  const formData = new FormData();
  formData.append("image", file, file.name || "post-image.jpg");

  const headers = getAuthHeaders();

  try {
    const response = await fetch(`${API_BASE_URL}/posts/images`, {
      method: "POST",
      headers,
      body: formData,
      signal,
    });

    if (!response.ok) throw createRequestError(await getErrorMessage(response), response.status);

    const data = await response.json();
    if (!data?.imageUrl) {
      throw createRequestError("이미지 업로드 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
    }

    return data.imageUrl;
  } catch (error) {
    if (error.name === "AbortError" || error.status) throw error;
    throw createRequestError("이미지 업로드 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export async function createPostComment(postId, content, { signal } = {}) {
  const response = await request(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: { content: String(content || "").trim() },
    signal,
  });

  if (Array.isArray(response?.comments)) {
    return { post: normalizePost(response) };
  }

  return { comment: normalizeComment(response) };
}

export async function deletePostComment(postId, commentId, { signal } = {}) {
  await request(`/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
    signal,
  });
}

export async function deletePost(postId, { signal } = {}) {
  await request(`/posts/${encodeURIComponent(postId)}`, { method: "DELETE", signal });
}
