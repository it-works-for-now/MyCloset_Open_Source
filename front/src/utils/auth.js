const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const USERS_KEY = "mycloset_users";
const CURRENT_USER_KEY = "mycloset_current_user";
const TOKEN_KEY = "mycloset_token";

// 백엔드 검증 에러 키를 프론트 폼 필드 키로 맞춘다.
function mapErrorKeys(errors) {
  if (!errors || Object.keys(errors).length === 0) {
    return {};
  }
  const keyMap = {
    id: "username",
    loginId: "username",
    passwordConfirm: "confirmPassword",
    nickName: "nickname",
    userNickname: "nickname",
    aiModelGender: "modelGender",
    gender: "modelGender",
  };
  const mapped = {};
  Object.entries(errors).forEach(([key, value]) => {
    const message = Array.isArray(value)
      ? value.filter(Boolean).join(" ")
      : typeof value === "object" && value !== null
        ? value.message || value.defaultMessage || ""
        : value;

    if (message) {
      mapped[keyMap[key] || key] = message;
    }
  });
  return mapped;
}

function isDuplicateNicknameError(result) {
  const details = [result.code, result.errorCode, result.error, result.message, result.detail]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();

  const refersToNickname = details.includes("nickname") || details.includes("닉네임");
  const refersToDuplicate =
    details.includes("duplicate") ||
    details.includes("already") ||
    details.includes("exist") ||
    details.includes("used") ||
    details.includes("중복") ||
    details.includes("사용");

  return refersToNickname && refersToDuplicate;
}

function getAuthErrors(result) {
  const errors = mapErrorKeys(result.errors);

  if (!errors.nickname && isDuplicateNicknameError(result)) {
    errors.nickname = result.message || "이미 사용 중인 닉네임입니다.";
  }

  return Object.keys(errors).length > 0 ? errors : mapSignupMessage(result.message);
}

function mapSignupMessage(message) {
  if (!message) {
    return { form: "회원가입에 실패했습니다." };
  }

  if (message.includes("아이디")) {
    return { username: message };
  }

  if (message.includes("이메일")) {
    return { email: message };
  }

  if (message.includes("닉네임")) {
    return { nickname: message };
  }

  if (message.includes("비밀번호")) {
    return { confirmPassword: message };
  }

  return { form: message };
}

function mapLoginMessage(result) {
  const message = result.message || "";
  const code = String(result.code || result.errorCode || result.error || "").toUpperCase();
  const isUserNotFound =
    result.status === 404 ||
    code.includes("USER_NOT_FOUND") ||
    code.includes("NOT_FOUND") ||
    message.includes("존재하지") ||
    message.includes("가입") ||
    message.includes("없는 아이디") ||
    message.includes("등록되지");

  return isUserNotFound ? "회원가입이 되어있지 않습니다." : "아이디 또는 비밀번호를 확인해주세요.";
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

function getUsers() {
  return readJson(USERS_KEY, []);
}

function setUsers(users) {
  writeJson(USERS_KEY, users);
}

export function getCurrentUser() {
  return readJson(CURRENT_USER_KEY, null);
}

export function logoutUser() {
  window.localStorage.removeItem(CURRENT_USER_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return readJson(TOKEN_KEY, null);
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 저장된 JWT로 백엔드에 본인 확인(/auth/me)해서 로그인 세션을 복원한다.
// 토큰이 없거나 만료/무효면 세션을 정리하고 null을 반환한다.
export async function fetchCurrentUser() {
  const token = getToken();
  if (!token) {
    return null;
  }

  if (!API_BASE_URL) {
    return getCurrentUser();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      logoutUser();
      return null;
    }

    const user = await response.json();
    writeJson(CURRENT_USER_KEY, user);
    return user;
  } catch {
    // 네트워크 오류 시에는 마지막으로 저장된 사용자 정보를 유지한다.
    return getCurrentUser();
  }
}

export function validateSignup(values) {
  const nextErrors = {};
  const labels = {
    username: "아이디",
    password: "비밀번호",
    confirmPassword: "비밀번호 확인",
    nickname: "닉네임",
    modelGender: "AI 모델 성별",
    email: "이메일",
  };

  Object.keys(labels).forEach((field) => {
    if (values[field].trim() === "") {
      nextErrors[field] = "필수 항목";
    }
  });

  if (values.username.trim() && !/^[A-Za-z0-9_]{4,20}$/.test(values.username)) {
    nextErrors.username = "영문, 숫자, 4~20자 이내";
  }

  if (values.password.trim() && !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(values.password)) {
    nextErrors.password = "8자 이상. 영문, 숫자, 특수문자 포함";
  }

  if (values.password.trim() && values.confirmPassword.trim() && values.password !== values.confirmPassword) {
    nextErrors.confirmPassword = "비밀번호가 다릅니다";
  }

  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    nextErrors.email = "이메일 형식 확인";
  }

  return nextErrors;
}

export function validateProfile(values) {
  const nextErrors = {};

  if (values.nickname.trim() === "") {
    nextErrors.nickname = "필수 항목";
  }

  if (!values.modelGender) {
    nextErrors.modelGender = "필수 항목";
  }

  if (values.email.trim() === "") {
    nextErrors.email = "필수 항목";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    nextErrors.email = "이메일 형식 확인";
  }

  if (values.password.trim() && !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(values.password)) {
    nextErrors.password = "8자 이상. 영문, 숫자, 특수문자 포함";
  }

  if (values.password.trim() || values.confirmPassword.trim()) {
    if (!values.currentPassword?.trim()) {
      nextErrors.currentPassword = "현재 비밀번호를 입력해주세요.";
    }

    if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "비밀번호가 다릅니다";
    }
  }

  return nextErrors;
}

export async function signupUser(values) {
  const payload = {
    id: values.username.trim(),
    password: values.password,
    passwordConfirm: values.confirmPassword,
    nickname: values.nickname.trim(),
    modelGender: values.modelGender,
    email: values.email.trim().toLowerCase(),
  };

  const result = await requestAuth("/auth/signup", {
    method: "POST",
    body: payload,
  });

  if (!result.ok) {
    return {
      ok: false,
      errors: getAuthErrors(result),
    };
  }

  if (result.accessToken) {
    writeJson(TOKEN_KEY, result.accessToken);
  }

  return { ok: true, user: result.user };
}

export async function loginUser(values) {
  const result = await requestAuth("/auth/login", {
    method: "POST",
    body: {
      id: values.username.trim(),
      password: values.password,
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      message: mapLoginMessage(result),
    };
  }

  writeJson(CURRENT_USER_KEY, result.user);
  if (result.accessToken) {
    writeJson(TOKEN_KEY, result.accessToken);
  }

  return { ok: true, user: result.user };
}

export async function updateCurrentUserProfile(values) {
  const payload = {
    nickname: values.nickname.trim(),
    modelGender: values.modelGender,
    email: values.email.trim().toLowerCase(),
  };

  if (values.password.trim()) {
    payload.currentPassword = values.currentPassword;
    payload.password = values.password;
    payload.passwordConfirm = values.confirmPassword;
  }

  if (API_BASE_URL) {
    const result = await requestProfile("/auth/me", {
      method: "PATCH",
      body: payload,
    });

    if (!result.ok) {
      const errors = getAuthErrors(result);
      if (result.message?.includes("현재 비밀번호")) {
        errors.currentPassword = result.message;
      }
      if (result.message?.includes("이전 비밀번호")) {
        errors.password = result.message;
      }
      return {
        ok: false,
        errors,
      };
    }

    const user = result.user || result;
    writeJson(CURRENT_USER_KEY, user);
    return { ok: true, user };
  }

  return mockUpdateCurrentUser(values);
}

export async function verifyCurrentPassword(currentPassword) {
  if (API_BASE_URL) {
    const result = await requestProfile("/auth/password/verify", {
      method: "POST",
      body: { currentPassword },
    });

    if (!result.ok) {
      return {
        ok: false,
        errors: {
          currentPassword: result.message || "현재 비밀번호가 일치하지 않습니다.",
        },
      };
    }

    return { ok: true };
  }

  return mockVerifyCurrentPassword(currentPassword);
}

export async function deleteCurrentUser() {
  if (API_BASE_URL) {
    const result = await requestProfile("/auth/me", { method: "DELETE" });

    if (!result.ok) {
      return {
        ok: false,
        message: result.message || "회원 탈퇴에 실패했습니다.",
      };
    }

    logoutUser();
    return { ok: true };
  }

  return mockDeleteCurrentUser();
}

async function requestProfile(endpoint, options) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method,
      headers: {
        ...getAuthHeaders(),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await response.json().catch(() => ({}));

    return response.ok
      ? { ok: true, status: response.status, ...data }
      : { ok: false, status: response.status, ...data };
  } catch {
    return {
      ok: false,
      message: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

async function requestAuth(endpoint, options) {
  if (!API_BASE_URL) {
    return mockAuthRequest(endpoint, options);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options.body),
    });
    const data = await response.json().catch(() => ({}));

    return response.ok
      ? { ok: true, status: response.status, ...data }
      : { ok: false, status: response.status, ...data };
  } catch {
    return {
      ok: false,
      message: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

async function mockAuthRequest(endpoint, options) {
  await new Promise((resolve) => setTimeout(resolve, 250));

  if (endpoint === "/auth/signup") {
    return mockSignup(options.body);
  }

  if (endpoint === "/auth/login") {
    return mockLogin(options.body);
  }

  return { ok: false, message: "지원하지 않는 요청입니다." };
}

function mockSignup(payload) {
  const users = getUsers();
  const errors = {};

  if (users.some((user) => user.id === payload.id)) {
    errors.username = "이미 사용 중";
  }

  if (users.some((user) => user.email === payload.email)) {
    errors.email = "이미 사용 중";
  }

  if (users.some((user) => user.nickname === payload.nickname)) {
    errors.nickname = "이미 사용 중";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const user = {
    id: payload.id,
    password: payload.password,
    nickname: payload.nickname,
    modelGender: payload.modelGender,
    email: payload.email,
    createdAt: new Date().toISOString(),
  };

  setUsers([...users, user]);

  return { ok: true, user: getPublicUser(user) };
}

function mockLogin(payload) {
  const user = getUsers().find((savedUser) => savedUser.id === payload.id);

  if (!user) {
    return { ok: false, status: 404, code: "USER_NOT_FOUND" };
  }

  if (user.password !== payload.password) {
    return { ok: false, message: "아이디 또는 비밀번호를 확인해주세요." };
  }

  return { ok: true, user: getPublicUser(user) };
}

async function mockUpdateCurrentUser(values) {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { ok: false, errors: { form: "로그인이 필요합니다." } };
  }

  const users = getUsers();
  const targetIndex = users.findIndex((user) => user.id === currentUser.id);

  if (targetIndex < 0) {
    return { ok: false, errors: { form: "사용자 정보를 찾을 수 없습니다." } };
  }

  const email = values.email.trim().toLowerCase();
  const nickname = values.nickname.trim();
  const modelGender = values.modelGender;
  const errors = {};

  if (users.some((user) => user.id !== currentUser.id && user.email === email)) {
    errors.email = "이미 사용 중";
  }

  if (users.some((user) => user.id !== currentUser.id && user.nickname === nickname)) {
    errors.nickname = "이미 사용 중";
  }

  if (values.password.trim() && users[targetIndex].password === values.password) {
    errors.password = "이전 비밀번호와 같습니다.";
  }

  if (values.password.trim() && users[targetIndex].password !== values.currentPassword) {
    errors.currentPassword = "현재 비밀번호가 일치하지 않습니다.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const nextUser = {
    ...users[targetIndex],
    nickname,
    modelGender,
    email,
    password: values.password.trim() ? values.password : users[targetIndex].password,
  };
  const nextUsers = [...users];
  nextUsers[targetIndex] = nextUser;
  const publicUser = getPublicUser(nextUser);

  setUsers(nextUsers);
  writeJson(CURRENT_USER_KEY, publicUser);

  return { ok: true, user: publicUser };
}

async function mockDeleteCurrentUser() {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  setUsers(getUsers().filter((user) => user.id !== currentUser.id));
  logoutUser();

  return { ok: true };
}

async function mockVerifyCurrentPassword(currentPassword) {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { ok: false, errors: { currentPassword: "로그인이 필요합니다." } };
  }

  const user = getUsers().find((savedUser) => savedUser.id === currentUser.id);
  if (!user || user.password !== currentPassword) {
    return {
      ok: false,
      errors: { currentPassword: "현재 비밀번호가 일치하지 않습니다." },
    };
  }

  return { ok: true };
}

function getPublicUser(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    modelGender: user.modelGender,
    email: user.email,
  };
}
