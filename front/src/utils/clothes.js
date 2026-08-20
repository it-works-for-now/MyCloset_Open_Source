import { getToken } from "./auth.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [String(value)];
}

function normalizeWarmthLevel(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

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
  if (response.status === 413) return "이미지 파일은 15MB 이하만 업로드할 수 있어요.";
  if (response.status === 415) return "이미지 파일만 업로드할 수 있어요.";

  try {
    const body = await response.json();
    return body.message || body.detail || "옷 정보를 처리하지 못했습니다. 다시 시도해 주세요.";
  } catch {
    return "옷 정보를 처리하지 못했습니다. 다시 시도해 주세요.";
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

function toSavePayload(values) {
  const colors = normalizeArray(values.colors || values.color);
  const seasons = normalizeArray(values.seasons || values.season);
  const styleTags = normalizeArray(values.styleTags || values.style || values.styles);
  const alias = String(values.alias || "").trim();
  const memo = String(values.memo || "").trim();

  return {
    alias: alias || null,
    category: values.category || "",
    subcategory: values.subcategory || values.subCategory || "",
    pattern: values.pattern || null,
    colors,
    seasons,
    styleTags,
    warmthLevel: normalizeWarmthLevel(values.warmthLevel),
    memo: memo || null,
    imageUrl: values.imageUrl || null,
  };
}

export function normalizeClothes(data) {
  const clothes = Array.isArray(data) ? data : data?.clothes || data?.content || data?.items || [];

  return clothes.map((item, index) => {
    const colors = normalizeArray(item.colors || item.color);
    const seasons = normalizeArray(item.seasons || item.season);
    const styleTags = normalizeArray(item.styleTags || item.style || item.styles);

    return {
      ...item,
      id: item.id ?? item.clothesId ?? index,
      name: item.name || item.clothesName || item.title || "",
      alias: typeof item.alias === "string" ? item.alias : "",
      category: item.category || item.type || "",
      subcategory: item.subcategory || item.subCategory || "",
      colors,
      color: colors[0] || "",
      pattern: item.pattern || "",
      seasons,
      season: seasons,
      styleTags,
      style: styleTags,
      warmthLevel: normalizeWarmthLevel(item.warmthLevel),
      imageUrl: item.imageUrl || item.image || item.thumbnailUrl || "",
      memo: item.memo || item.details || item.description || "",
    };
  });
}

export async function fetchMyClothes(user, { signal } = {}) {
  if (!user) return [];
  return normalizeClothes(await request("/clothes", { signal }));
}

export async function uploadClothesImage(file, { signal } = {}) {
  const formData = new FormData();
  formData.append("image", file, file.name || "clothes-image.jpg");

  const headers = getAuthHeaders();
  try {
    const response = await fetch(`${API_BASE_URL}/clothes/images`, {
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

export async function createClothes(values, { signal } = {}) {
  const response = await request("/clothes", {
    method: "POST",
    body: toSavePayload(values),
    signal,
  });
  return normalizeClothes([response])[0];
}

export async function updateClothes(clothesId, values, { signal } = {}) {
  const response = await request(`/clothes/${clothesId}`, {
    method: "PUT",
    body: toSavePayload(values),
    signal,
  });
  return normalizeClothes([response])[0];
}

export async function deleteClothes(clothesId, { signal } = {}) {
  await request(`/clothes/${clothesId}`, { method: "DELETE", signal });
}
