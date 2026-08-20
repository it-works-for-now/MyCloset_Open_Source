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
  if (response.status === 400) {
    try {
      const body = await response.json();
      return body.message || "요청 내용을 확인해 주세요.";
    } catch {
      return "요청 내용을 확인해 주세요.";
    }
  }

  if (response.status === 401) {
    return "로그인이 만료되었거나 인증이 필요합니다. 다시 로그인해 주세요.";
  }

  if (response.status === 422) {
    try {
      const body = await response.json();
      return body.message || body.detail || "조건에 맞는 코디를 찾지 못했습니다. 다시 시도해 주세요.";
    } catch {
      return "조건에 맞는 코디를 찾지 못했습니다. 다시 시도해 주세요.";
    }
  }

  if (response.status === 503) {
    return "AI 추천 서버가 잠시 응답하지 않습니다. 잠시 후 다시 시도해 주세요.";
  }

  try {
    const body = await response.json();
    return body.message || body.detail || "데일리룩 추천을 처리하지 못했습니다. 다시 시도해 주세요.";
  } catch {
    return "데일리룩 추천을 처리하지 못했습니다. 다시 시도해 주세요.";
  }
}

async function request(endpoint, { method = "GET", body, signal } = {}) {
  if (!API_BASE_URL) {
    throw createRequestError("백엔드 주소가 설정되지 않았습니다.", 500);
  }

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
    throw createRequestError("데일리룩 추천 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function normalizeRecommendations(data) {
  const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];

  return {
    ...data,
    recommendations: recommendations.map((recommendation, index) => ({
      id: recommendation.id || `daily-look-${index + 1}`,
      title: typeof recommendation.title === "string" ? recommendation.title.trim() : "",
      slots: recommendation.slots && typeof recommendation.slots === "object" ? recommendation.slots : {},
      reason: recommendation.reason || "",
      styleKeywords: Array.isArray(recommendation.styleKeywords)
        ? recommendation.styleKeywords.filter(Boolean)
        : [],
    })),
  };
}

function toImageItems(items) {
  const entries = Object.entries(items || {}).filter(([, clothesId]) => {
    return clothesId !== null && clothesId !== undefined && clothesId !== "";
  });

  return Object.fromEntries(entries);
}

export async function recommendDailyLook(situation, { signal } = {}) {
  const trimmedSituation = String(situation || "").trim();

  if (!trimmedSituation) {
    throw createRequestError("원하는 느낌이나 상황을 입력해 주세요.", 400);
  }

  if (trimmedSituation.length > 500) {
    throw createRequestError("요청 문구는 500자 이하로 입력해 주세요.", 400);
  }

  const response = await request("/daily-look/recommend", {
    method: "POST",
    body: { situation: trimmedSituation },
    signal,
  });

  return normalizeRecommendations(response);
}

export async function recommendDailyLookWithOptions(
  situation,
  { considerWeather = false, latitude, longitude, signal } = {}
) {
  const trimmedSituation = String(situation || "").trim();

  if (!trimmedSituation) {
    throw createRequestError("원하는 느낌이나 상황을 입력해 주세요.", 400);
  }

  if (trimmedSituation.length > 500) {
    throw createRequestError("요청 문구는 500자 이하로 입력해 주세요.", 400);
  }

  const body = {
    situation: trimmedSituation,
    considerWeather: Boolean(considerWeather),
  };

  if (typeof latitude === "number" && typeof longitude === "number") {
    body.latitude = latitude;
    body.longitude = longitude;
  }

  const response = await request("/daily-look/recommend", {
    method: "POST",
    body,
    signal,
  });

  return normalizeRecommendations(response);
}

export async function fetchCurrentWeather(latitude, longitude, { signal } = {}) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw createRequestError("날씨를 확인하려면 위치 정보가 필요합니다.", 400);
  }

  return request(
    `/weather?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
    {
      signal,
    }
  );
}

export async function generateDailyLookImage(items, styleKeywords = [], { signal } = {}) {
  const normalizedItems = toImageItems(items);

  if (Object.keys(normalizedItems).length === 0) {
    throw createRequestError("이미지를 생성할 옷을 하나 이상 선택해 주세요.", 400);
  }

  const response = await request("/daily-look/image", {
    method: "POST",
    body: {
      items: normalizedItems,
      styleKeywords: Array.isArray(styleKeywords) ? styleKeywords.filter(Boolean) : [],
    },
    signal,
  });

  return response?.imageUrl || "";
}
