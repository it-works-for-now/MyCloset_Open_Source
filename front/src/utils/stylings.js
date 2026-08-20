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
  if (response.status === 401) {
    return "로그인이 만료되었거나 인증이 필요합니다. 다시 로그인해 주세요.";
  }

  try {
    const body = await response.json();
    return body.message || body.detail || "코디 정보를 처리하지 못했습니다. 다시 시도해 주세요.";
  } catch {
    return "코디 정보를 처리하지 못했습니다. 다시 시도해 주세요.";
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
    throw createRequestError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function normalizeStyling(styling, index = 0) {
  const items = styling?.items && typeof styling.items === "object" ? styling.items : {};

  return {
    ...styling,
    id: styling?.id ?? styling?.stylingId ?? index,
    stylingId: styling?.stylingId ?? styling?.id ?? index,
    name: styling?.name || "",
    memo: styling?.memo || "",
    items,
  };
}

function normalizeStylings(data) {
  const stylings = Array.isArray(data) ? data : data?.stylings || data?.content || data?.items || [];
  return stylings.map((styling, index) => normalizeStyling(styling, index));
}

function toStylingPayload(styling) {
  const items = {};

  Object.entries(styling.items || {}).forEach(([slot, clothes]) => {
    const clothesId = clothes?.id ?? clothes?.clothesId;

    // Placeholder images have no clothes identifier and must not be sent to the API.
    if (clothesId !== undefined && clothesId !== null && clothesId !== "") {
      items[slot] = { id: clothesId };
    }
  });

  const memo = String(styling.memo ?? "").trim();

  return {
    name: String(styling.name || "").trim(),
    memo: memo || null,
    items,
  };
}

export async function fetchSavedStylings(user, { signal } = {}) {
  if (!user) return [];
  return normalizeStylings(await request("/stylings", { signal }));
}

export async function fetchStyling(user, stylingId, { signal } = {}) {
  if (!user) return null;
  return normalizeStyling(await request(`/stylings/${stylingId}`, { signal }));
}

export async function saveStyling(user, styling, { signal } = {}) {
  if (!user) throw createRequestError("로그인이 필요합니다. 다시 로그인해 주세요.", 401);

  const response = await request("/stylings", {
    method: "POST",
    body: toStylingPayload(styling),
    signal,
  });

  return normalizeStyling(response);
}

export async function updateStyling(user, stylingId, values, { signal } = {}) {
  if (!user) throw createRequestError("로그인이 필요합니다. 다시 로그인해 주세요.", 401);

  const response = await request(`/stylings/${stylingId}`, {
    method: "PUT",
    body: toStylingPayload(values),
    signal,
  });

  return normalizeStyling(response);
}

export async function deleteStyling(user, stylingId, { signal } = {}) {
  if (!user) throw createRequestError("로그인이 필요합니다. 다시 로그인해 주세요.", 401);
  await request(`/stylings/${stylingId}`, { method: "DELETE", signal });
}
