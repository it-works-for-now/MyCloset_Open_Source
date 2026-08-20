import { getToken } from "./auth.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const FIT_LOG_MODE = import.meta.env.VITE_FIT_LOG_MODE || "auto";
const USE_FIT_LOG_BACKEND = FIT_LOG_MODE === "backend" || (FIT_LOG_MODE === "auto" && Boolean(API_BASE_URL));
const FIT_ROOMS_STORAGE_PREFIX = "mycloset:fit-log-rooms:";
const FIT_ROOM_STATE_STORAGE_PREFIX = "mycloset:fit-log-room-state:";

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
  if (response.status === 403) return "핏로그를 처리할 권한이 없습니다.";
  if (response.status === 404) return "핏로그 방을 찾을 수 없습니다.";
  if (response.status === 409) return "이미 참여했거나 방 인원이 가득 찼습니다.";
  if (response.status === 413) return "이미지 파일은 15MB 이하만 업로드할 수 있습니다.";
  if (response.status === 415) return "JPEG, PNG, WEBP 이미지 파일만 업로드할 수 있습니다.";

  try {
    const body = await response.json();
    return body.message || body.detail || "핏로그 정보를 처리하지 못했습니다. 다시 시도해 주세요.";
  } catch {
    return "핏로그 정보를 처리하지 못했습니다. 다시 시도해 주세요.";
  }
}

async function request(endpoint, { method = "GET", body, signal } = {}) {
  if (!API_BASE_URL) {
    throw createRequestError("핏로그 백엔드 주소가 설정되지 않았습니다.", 500);
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

    if (!response.ok) throw createRequestError(await getErrorMessage(response), response.status);
    if (response.status === 204) return undefined;
    return response.json();
  } catch (error) {
    if (error.name === "AbortError" || error.status) throw error;
    throw createRequestError("핏로그 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

async function uploadImage(endpoint, file, fallbackName, { signal } = {}) {
  if (!API_BASE_URL) {
    throw createRequestError("핏로그 백엔드 주소가 설정되지 않았습니다.", 500);
  }

  const formData = new FormData();
  formData.append("image", file, file.name || fallbackName);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
      signal,
    });

    if (!response.ok) throw createRequestError(await getErrorMessage(response), response.status);

    const data = await response.json();
    return data.imageUrl || data.image_url || data.url || "";
  } catch (error) {
    if (error.name === "AbortError" || error.status) throw error;
    throw createRequestError("이미지를 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function normalizeFitRoom(room, index = 0) {
  if (!room) return null;

  const id = room.id ?? room.roomId ?? room.fitRoomId ?? room.code ?? index;
  const code = room.code ?? room.roomCode ?? id;
  const role = String(room.role ?? (room.isHost ? "host" : "member")).toLowerCase();

  return {
    ...room,
    id,
    code,
    name: room.name || room.roomName || "",
    status: room.status || room.notificationStatus || "읽음",
    recentMessageAuthor: room.recentMessageAuthor || room.lastMessageAuthor || room.messageAuthor || "",
    isFitComplete: Boolean(room.isFitComplete ?? room.fitComplete),
    memberLimit: Number(room.memberLimit || room.maxMembers || room.capacity || 2),
    role,
    isHost: Boolean(room.isHost) || role === "host",
  };
}

function normalizeFitRooms(data) {
  const rooms = Array.isArray(data) ? data : data?.rooms || data?.content || data?.items || [];
  return rooms.map(normalizeFitRoom).filter(Boolean);
}

function normalizeFitRoomState(data, room) {
  const defaultState = getDefaultRoomState(room);
  if (!data) return defaultState;

  return {
    ...defaultState,
    profileImageUrl: data.profileImageUrl || data.profile_image_url || defaultState.profileImageUrl,
    members: Array.isArray(data.members) ? data.members : defaultState.members,
    myLog: {
      imageUrl:
        data.myLog?.imageUrl ||
        data.myLog?.image_url ||
        data.my_log?.imageUrl ||
        data.my_log?.image_url ||
        "",
      caption: data.myLog?.caption || data.my_log?.caption || "",
    },
    reactions: data.reactions || defaultState.reactions,
    reactionDetails: data.reactionDetails || data.reaction_details || defaultState.reactionDetails,
    messages: Array.isArray(data.messages) ? data.messages : defaultState.messages,
  };
}

function getFitRoomsStorageKey(user) {
  return `${FIT_ROOMS_STORAGE_PREFIX}${user?.email || user?.nickname || "guest"}`;
}

function getFitRoomStateStorageKey(user, roomId) {
  return `${FIT_ROOM_STATE_STORAGE_PREFIX}${user?.email || user?.nickname || "guest"}:${roomId}`;
}

function readStoredFitRooms(user) {
  try {
    const value = window.localStorage.getItem(getFitRoomsStorageKey(user));
    const parsedRooms = value ? JSON.parse(value) : [];

    return Array.isArray(parsedRooms) ? parsedRooms : [];
  } catch {
    return [];
  }
}

function writeStoredFitRooms(user, rooms) {
  try {
    window.localStorage.setItem(getFitRoomsStorageKey(user), JSON.stringify(rooms));
  } catch {
    // Mock storage can fail in private browsing or full-disk cases.
  }
}

function addFitRoom(rooms, room) {
  return [room, ...rooms.filter((item) => item.id !== room.id)];
}

function generateTemporaryRoomCode() {
  // TODO: Replace this temporary client-side code with the unique room code returned by the room creation API.
  return Math.random().toString(36).slice(2, 10);
}

function getDefaultRoomState(room) {
  return {
    profileImageUrl: "",
    members: Array.isArray(room?.members) ? room.members : [],
    myLog: {
      imageUrl: "",
      caption: "",
    },
    reactions: {},
    reactionDetails: {},
    messages: [{ id: "chat-1", author: "Test_user2", text: "오늘 룩 올렸어?" }],
  };
}

function readStoredFitRoomState(user, roomId, room) {
  if (!user || !roomId) return getDefaultRoomState(room);

  try {
    const value = window.localStorage.getItem(getFitRoomStateStorageKey(user, roomId));
    const parsedState = value ? JSON.parse(value) : {};
    const defaultState = getDefaultRoomState(room);

    return {
      ...defaultState,
      ...parsedState,
      myLog: {
        ...defaultState.myLog,
        ...(parsedState.myLog || {}),
      },
      reactions: parsedState.reactions || defaultState.reactions,
      reactionDetails: parsedState.reactionDetails || defaultState.reactionDetails,
      messages: Array.isArray(parsedState.messages) ? parsedState.messages : defaultState.messages,
      members: Array.isArray(parsedState.members) ? parsedState.members : defaultState.members,
    };
  } catch {
    return getDefaultRoomState(room);
  }
}

function writeStoredFitRoomState(user, roomId, state) {
  if (!user || !roomId) return;

  try {
    window.localStorage.setItem(getFitRoomStateStorageKey(user, roomId), JSON.stringify(state));
  } catch {
    // Mock storage can fail; backend integration will own this state later.
  }
}

function updateStoredFitRoomState(user, roomId, updater, room) {
  const currentState = readStoredFitRoomState(user, roomId, room);
  const nextState = typeof updater === "function" ? updater(currentState) : { ...currentState, ...updater };

  writeStoredFitRoomState(user, roomId, nextState);
  return nextState;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = () => reject(new Error("Image file could not be read."));
    reader.readAsDataURL(file);
  });
}

export async function fetchFitRooms(user) {
  if (!user) return [];

  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRooms(await request("/fit-rooms"));
  }

  // TODO: Replace this mock/localStorage read with GET /fit-rooms.
  return readStoredFitRooms(user);
}

export async function createFitRoom(user, { name, memberLimit }) {
  if (!user) return null;

  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoom(
      await request("/fit-rooms", {
        method: "POST",
        body: { name, memberLimit },
      })
    );
  }

  // TODO: Replace this mock/localStorage write with POST /fit-rooms.
  const rooms = readStoredFitRooms(user);
  let temporaryRoomCode = generateTemporaryRoomCode();

  while (rooms.some((room) => room.id === temporaryRoomCode || room.code === temporaryRoomCode)) {
    temporaryRoomCode = generateTemporaryRoomCode();
  }

  const room = {
    id: temporaryRoomCode,
    name,
    code: temporaryRoomCode,
    status: "읽음",
    isFitComplete: false,
    memberLimit,
    role: "host",
  };

  writeStoredFitRooms(user, addFitRoom(rooms, room));
  return room;
}

export async function prepareFitRoomJoinByCode(code) {
  const trimmedCode = String(code || "").trim();
  if (!trimmedCode) return null;

  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoom(await request(`/fit-rooms/by-code/${encodeURIComponent(trimmedCode)}`));
  }

  // TODO: Replace this mock room lookup with POST /fit-rooms/join/preview or GET /fit-rooms/by-code/{code}.
  return {
    id: trimmedCode,
    code: trimmedCode,
    name: "Test Room",
    status: "new chat",
    isFitComplete: false,
    role: "member",
  };
}

export async function joinFitRoom(user, room) {
  if (!user || !room) return null;

  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoom(
      await request("/fit-rooms/join", {
        method: "POST",
        body: { code: room.code || room.id },
      })
    );
  }

  // TODO: Replace this mock/localStorage write with POST /fit-rooms/join.
  const rooms = readStoredFitRooms(user);
  const joinedRoom = {
    ...room,
    status: room.status || "읽음",
    isFitComplete: Boolean(room.isFitComplete),
    memberLimit: room.memberLimit || 2,
    role: room.role || "member",
  };

  writeStoredFitRooms(user, addFitRoom(rooms, joinedRoom));
  return joinedRoom;
}

export async function updateFitRoom(user, roomId, updater) {
  if (!user || !roomId) return null;

  if (USE_FIT_LOG_BACKEND) {
    const patch = typeof updater === "function" ? updater({ id: roomId }) : updater;
    return normalizeFitRoom(
      await request(`/fit-rooms/${encodeURIComponent(roomId)}`, {
        method: "PATCH",
        body: patch,
      })
    );
  }

  // TODO: Replace this mock/localStorage update with PATCH /fit-rooms/{roomId}.
  const rooms = readStoredFitRooms(user);
  let updatedRoom = null;
  const nextRooms = rooms.map((room) => {
    if (room.id !== roomId && room.code !== roomId) return room;

    updatedRoom = typeof updater === "function" ? updater(room) : { ...room, ...updater };
    return updatedRoom;
  });

  writeStoredFitRooms(user, nextRooms);
  return updatedRoom;
}

export async function leaveFitRoom(user, roomId) {
  if (!user || !roomId) return;

  if (USE_FIT_LOG_BACKEND) {
    await request(`/fit-rooms/${encodeURIComponent(roomId)}/leave`, {
      method: "POST",
    });
    return;
  }

  // TODO: Replace this mock/localStorage removal with DELETE /fit-rooms/{roomId} or POST /fit-rooms/{roomId}/leave.
  const rooms = readStoredFitRooms(user);
  writeStoredFitRooms(
    user,
    rooms.filter((room) => room.id !== roomId && room.code !== roomId)
  );
}

export async function deleteFitRoom(user, roomId) {
  if (!user || !roomId) return;

  if (USE_FIT_LOG_BACKEND) {
    await request(`/fit-rooms/${encodeURIComponent(roomId)}`, {
      method: "DELETE",
    });
    return;
  }

  // TODO: Replace this mock/localStorage removal with DELETE /fit-rooms/{roomId}.
  const rooms = readStoredFitRooms(user);
  writeStoredFitRooms(
    user,
    rooms.filter((room) => room.id !== roomId && room.code !== roomId)
  );
}

export function createFitRoomInviteUrl(room, origin = window.location.origin) {
  const inviteCode = room?.code || room?.id || "abcd1234";
  return `${origin}/fit-log/invite/${inviteCode}`;
}

export async function fetchFitRoomState(user, room) {
  const roomId = room?.code || room?.roomCode || room?.id;

  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoomState(await request(`/fit-rooms/${encodeURIComponent(roomId)}`), room);
  }

  // TODO: Replace this mock/localStorage read with GET /fit-rooms/{roomId}.
  return readStoredFitRoomState(user, roomId, room);
}

export async function saveFitRoomStateSnapshot(user, roomId, state) {
  if (USE_FIT_LOG_BACKEND) {
    return state;
  }

  // TODO: Replace this mock/localStorage snapshot with individual backend mutations or a room-state sync API.
  const nextState = {
    profileImageUrl: state.profileImageUrl || "",
    members: Array.isArray(state.members) ? state.members : [],
    myLog: {
      imageUrl: state.myLog?.imageUrl || "",
      caption: state.myLog?.caption || "",
    },
    reactions: state.reactions || {},
    reactionDetails: state.reactionDetails || {},
    messages: Array.isArray(state.messages) ? state.messages : [],
  };

  writeStoredFitRoomState(user, roomId, nextState);
  return nextState;
}

export async function uploadFitLogImage(file) {
  if (USE_FIT_LOG_BACKEND) {
    return uploadImage("/fit-logs/images", file, "fit-log-image.jpg");
  }

  // TODO: Replace this mock data URL with a FormData upload and return the backend imageUrl.
  return readFileAsDataUrl(file);
}

export async function uploadFitRoomProfileImage(file) {
  if (USE_FIT_LOG_BACKEND) {
    return uploadImage("/fit-rooms/profile-images", file, "fit-profile-image.jpg");
  }

  // TODO: Replace this mock data URL with a FormData upload and return RoomMember.profileImageUrl.
  return readFileAsDataUrl(file);
}

export async function updateFitRoomProfileImage(user, roomId, profileImageUrl) {
  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoomState(
      await request(`/fit-rooms/${encodeURIComponent(roomId)}/members/me/profile`, {
        method: "PATCH",
        body: { profileImageUrl },
      })
    );
  }

  // TODO: Replace this mock/localStorage update with PATCH /fit-rooms/{roomId}/members/me/profile.
  return updateStoredFitRoomState(user, roomId, (state) => ({
    ...state,
    profileImageUrl,
  }));
}

export async function saveMyFitLog(user, roomId, log) {
  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoomState(
      await request(`/fit-rooms/${encodeURIComponent(roomId)}/logs/me`, {
        method: "PUT",
        body: {
          imageUrl: log.imageUrl || "",
          caption: log.caption || "",
        },
      })
    );
  }

  // TODO: Replace this mock/localStorage update with POST or PUT /fit-rooms/{roomId}/logs/me.
  return updateStoredFitRoomState(user, roomId, (state) => ({
    ...state,
    myLog: {
      imageUrl: log.imageUrl || "",
      caption: log.caption || "",
    },
  }));
}

export async function deleteMyFitLog(user, roomId) {
  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoomState(
      await request(`/fit-rooms/${encodeURIComponent(roomId)}/logs/me`, {
        method: "DELETE",
      })
    );
  }

  // TODO: Replace this mock/localStorage update with DELETE /fit-rooms/{roomId}/logs/me.
  return updateStoredFitRoomState(user, roomId, (state) => {
    const nextReactions = { ...state.reactions };
    const nextReactionDetails = { ...state.reactionDetails };
    delete nextReactions.host;
    delete nextReactionDetails.host;

    return {
      ...state,
      myLog: { imageUrl: "", caption: "" },
      reactions: nextReactions,
      reactionDetails: nextReactionDetails,
    };
  });
}

export async function updateFitLogCaption(user, roomId, memberId, caption) {
  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoomState(
      await request(`/fit-rooms/${encodeURIComponent(roomId)}/logs/${encodeURIComponent(memberId)}`, {
        method: "PATCH",
        body: { caption },
      })
    );
  }

  // TODO: Replace this mock/localStorage update with PATCH /fit-logs/{logId}.
  return updateStoredFitRoomState(user, roomId, (state) => {
    if (memberId === "host") {
      return {
        ...state,
        myLog: {
          ...state.myLog,
          caption,
        },
      };
    }

    return {
      ...state,
      members: state.members.map((member) => (member.id === memberId ? { ...member, caption } : member)),
    };
  });
}

export async function kickFitRoomMember(user, roomId, memberId) {
  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoomState(
      await request(`/fit-rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(memberId)}`, {
        method: "DELETE",
      })
    );
  }

  // TODO: Replace this mock/localStorage update with DELETE /fit-rooms/{roomId}/members/{memberId}.
  return updateStoredFitRoomState(user, roomId, (state) => ({
    ...state,
    members: state.members.filter((member) => member.id !== memberId),
  }));
}

export async function addFitLogReaction(user, roomId, memberId, reaction) {
  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoomState(
      await request(
        `/fit-rooms/${encodeURIComponent(roomId)}/logs/${encodeURIComponent(memberId)}/reactions`,
        {
          method: "POST",
          body: reaction,
        }
      )
    );
  }

  // TODO: Replace this mock/localStorage update with POST /fit-logs/{logId}/reactions.
  return updateStoredFitRoomState(user, roomId, (state) => ({
    ...state,
    reactions: {
      ...state.reactions,
      [memberId]: reaction.emoji,
    },
    reactionDetails: {
      ...state.reactionDetails,
      [memberId]: [...(state.reactionDetails[memberId] || []), reaction],
    },
  }));
}

export async function sendFitRoomMessage(user, roomId, message) {
  if (USE_FIT_LOG_BACKEND) {
    return normalizeFitRoomState(
      await request(`/fit-rooms/${encodeURIComponent(roomId)}/messages`, {
        method: "POST",
        body: message,
      })
    );
  }

  // TODO: Replace this mock/localStorage update with POST /fit-rooms/{roomId}/messages.
  return updateStoredFitRoomState(user, roomId, (state) => ({
    ...state,
    messages: [...state.messages, message],
  }));
}
