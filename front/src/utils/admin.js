import { getCurrentUser, getToken } from "./auth.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const USERS_KEY = "mycloset_users";
const CURRENT_USER_KEY = "mycloset_current_user";

function createRequestError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getAuthHeaders() {
  const token = getToken();
  if (!token) {
    throw createRequestError("관리자 로그인이 필요합니다.", 401);
  }

  return { Authorization: `Bearer ${token}` };
}

async function getErrorMessage(response) {
  try {
    const body = await response.json();
    return body.message || body.detail || "관리자 요청을 처리하지 못했습니다.";
  } catch {
    return "관리자 요청을 처리하지 못했습니다.";
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

    if (!response.ok) {
      throw createRequestError(await getErrorMessage(response), response.status);
    }

    if (response.status === 204) return undefined;
    return response.json();
  } catch (error) {
    if (error.name === "AbortError" || error.status) throw error;
    throw createRequestError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}

function toPublicAdminUser(user, index = 0) {
  return {
    id: user.id || user.loginId || user.username || `user-${index + 1}`,
    loginId: user.loginId || user.id || user.username || "",
    email: user.email || "",
    nickname: user.nickname || "",
    role: user.role || "USER",
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || "",
  };
}

function normalizeUsers(data) {
  const users = Array.isArray(data) ? data : data?.users || data?.content || data?.items || [];
  return users.map(toPublicAdminUser);
}

function readMockUsers() {
  return readJson(USERS_KEY, []).map((user, index) => ({
    ...user,
    role: user.role || "USER",
    loginId: user.loginId || user.id || `user-${index + 1}`,
  }));
}

function writeMockUsers(users) {
  writeJson(USERS_KEY, users);
}

function syncCurrentUser(nextUser) {
  const currentUser = getCurrentUser();
  if (!currentUser || String(currentUser.id) !== String(nextUser.id)) {
    return null;
  }

  const publicUser = toPublicAdminUser({ ...currentUser, ...nextUser });
  writeJson(CURRENT_USER_KEY, publicUser);
  return publicUser;
}

export async function fetchAdminUsers({ query = "", signal } = {}) {
  if (API_BASE_URL) {
    const search = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
    return normalizeUsers(await request(`/admin/users${search}`, { signal }));
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
  const keyword = query.trim().toLowerCase();
  const users = readMockUsers();

  if (!keyword) {
    return normalizeUsers(users);
  }

  return normalizeUsers(
    users.filter((user) =>
      [user.email, user.id, user.loginId, user.nickname].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword)
      )
    )
  );
}

export async function fetchAdminUser(userId, { signal } = {}) {
  if (API_BASE_URL) {
    return toPublicAdminUser(await request(`/admin/users/${encodeURIComponent(userId)}`, { signal }));
  }

  await new Promise((resolve) => setTimeout(resolve, 120));
  const user = readMockUsers().find((item) => String(item.id) === String(userId));
  if (!user) {
    throw createRequestError("회원을 찾을 수 없습니다.", 404);
  }

  return toPublicAdminUser(user);
}

export async function updateAdminUserRole(userId, role, { signal } = {}) {
  if (API_BASE_URL) {
    return toPublicAdminUser(
      await request(`/admin/users/${encodeURIComponent(userId)}/role`, {
        method: "PATCH",
        body: { role },
        signal,
      })
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 160));
  const users = readMockUsers();
  const targetIndex = users.findIndex((user) => String(user.id) === String(userId));

  if (targetIndex < 0) {
    throw createRequestError("회원을 찾을 수 없습니다.", 404);
  }

  const nextUser = { ...users[targetIndex], role };
  const nextUsers = [...users];
  nextUsers[targetIndex] = nextUser;
  writeMockUsers(nextUsers);

  return {
    user: toPublicAdminUser(nextUser),
    currentUser: syncCurrentUser(nextUser),
  };
}

export async function deleteAdminUser(userId, { signal } = {}) {
  if (API_BASE_URL) {
    await request(`/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      signal,
    });
    return { ok: true };
  }

  await new Promise((resolve) => setTimeout(resolve, 160));
  const users = readMockUsers();
  const nextUsers = users.filter((user) => String(user.id) !== String(userId));

  if (nextUsers.length === users.length) {
    throw createRequestError("회원을 찾을 수 없습니다.", 404);
  }

  writeMockUsers(nextUsers);
  return { ok: true };
}
