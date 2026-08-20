import { getToken } from "./auth.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const AI_ANALYSIS_TIMEOUT_MS = Number(import.meta.env.VITE_AI_ANALYSIS_TIMEOUT_MS || 120000);
const USE_MOCK_ANALYSIS = import.meta.env.DEV && import.meta.env.VITE_GARMENT_ANALYSIS_MODE === "mock";

const NETWORK_ERROR_MESSAGE = "AI 분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
const AUTH_ERROR_MESSAGE = "로그인이 만료되었거나 인증이 필요해요. 다시 로그인해 주세요.";

function createAnalysisError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function waitForMockAnalysis(signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, 1200);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Analysis cancelled", "AbortError"));
      },
      { once: true }
    );
  });
}

async function toImageUrl(fileOrImageUrl) {
  if (typeof fileOrImageUrl === "string") return fileOrImageUrl;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(fileOrImageUrl);
  });
}

async function toImageFile(fileOrImageUrl) {
  if (fileOrImageUrl instanceof File) return fileOrImageUrl;

  const response = await fetch(fileOrImageUrl);
  if (!response.ok) throw new Error("이미지 파일을 준비하지 못했습니다.");

  const blob = await response.blob();
  return new File([blob], "garment-image.jpg", {
    type: blob.type || "image/jpeg",
  });
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function normalizeWarmthLevel(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

function normalizeProcessingMs(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeAnalysisResponse(response, imageUrl) {
  const attributes = response?.attributes || {};

  return {
    draft: {
      imageUrl,
      category: attributes.category || "",
      subcategory: attributes.subcategory || "",
      colors: normalizeStringArray(attributes.colors),
      pattern: attributes.pattern || "",
      seasons: normalizeStringArray(attributes.seasons),
      styleTags: normalizeStringArray(attributes.styleTags),
      warmthLevel: normalizeWarmthLevel(attributes.warmthLevel),
      // 메모는 AI가 자동 입력하지 않고 사용자가 직접 작성한다.
      memo: "",
    },
    metadata: {
      model: typeof response?.model === "string" ? response.model : "",
      processingMs: normalizeProcessingMs(response?.processingMs),
      requiresReview: response?.requiresReview === true,
      uncertainFields: normalizeStringArray(attributes.uncertainFields),
    },
  };
}

async function getErrorMessage(response) {
  if (response.status === 401) return AUTH_ERROR_MESSAGE;
  if (response.status === 413) return "이미지 파일은 15MB 이하만 업로드할 수 있어요.";
  if (response.status === 415) return "이미지 파일만 업로드할 수 있어요.";
  if ([502, 503, 504].includes(response.status)) return NETWORK_ERROR_MESSAGE;

  try {
    const body = await response.json();
    return body.detail || body.message || "AI 분석 요청에 실패했습니다.";
  } catch {
    return "AI 분석 요청에 실패했습니다.";
  }
}

async function analyzeWithMockFallback(fileOrImageUrl, signal) {
  const imageUrl = await toImageUrl(fileOrImageUrl);
  await waitForMockAnalysis(signal);

  // Development-only mock fallback. The real request must use the Backend analysis API.
  return {
    draft: {
      imageUrl,
      category: "TOP",
      subcategory: "SWEATSHIRT",
      colors: ["NAVY"],
      pattern: "SOLID",
      seasons: ["SPRING", "FALL"],
      styleTags: ["CASUAL"],
      warmthLevel: 3,
      memo: "",
    },
    metadata: {
      model: "mock-garment-analysis",
      processingMs: 1200,
      requiresReview: false,
      uncertainFields: [],
    },
  };
}

/**
 * Sends a garment image only to the Backend analysis API.
 * The Backend is responsible for delegating image analysis and returning the result.
 */
export async function analyzeGarmentImage(fileOrImageUrl, { signal } = {}) {
  if (USE_MOCK_ANALYSIS) return analyzeWithMockFallback(fileOrImageUrl, signal);

  const token = getToken();
  if (!token) throw createAnalysisError(AUTH_ERROR_MESSAGE, 401);

  const [imageUrl, imageFile] = await Promise.all([toImageUrl(fileOrImageUrl), toImageFile(fileOrImageUrl)]);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AI_ANALYSIS_TIMEOUT_MS);
  const abortRequest = () => controller.abort();
  signal?.addEventListener("abort", abortRequest, { once: true });

  try {
    const formData = new FormData();
    formData.append("image", imageFile, imageFile.name || "garment-image.jpg");

    const response = await fetch(`${API_BASE_URL}/clothes/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) throw createAnalysisError(await getErrorMessage(response), response.status);
    return normalizeAnalysisResponse(await response.json(), imageUrl);
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Analysis cancelled", "AbortError");
    if (controller.signal.aborted) {
      throw createAnalysisError(NETWORK_ERROR_MESSAGE);
    }
    if (error instanceof TypeError) throw createAnalysisError(NETWORK_ERROR_MESSAGE);
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortRequest);
  }
}
