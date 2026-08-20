import React from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import ComingSoonPage from "./pages/ComingSoonPage.jsx";
import ClosetPage from "./pages/ClosetPage.jsx";
import StylingPage from "./pages/StylingPage.jsx";
import StylingAddPage from "./pages/StylingAddPage.jsx";
import DailyLookPage from "./pages/DailyLookPage.jsx";
import DailyLookResultPage from "./pages/DailyLookResultPage.jsx";
import FitLogPage from "./pages/FitLogPage.jsx";
import FitLogRoomPage from "./pages/FitLogRoomPage.jsx";
import BoardPage from "./pages/BoardPage.jsx";
import MyPage from "./pages/MyPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import { navItems, routeTitles } from "./data/navItems.js";
import { getCurrentUser, logoutUser, fetchCurrentUser } from "./utils/auth.js";
import { joinFitRoom, prepareFitRoomJoinByCode } from "./utils/fitLog.js";
import { getPathname, navigateTo } from "./utils/router.js";

const PENDING_FIT_LOG_INVITE_KEY = "mycloset:pending-fit-log-invite";
const ACTIVE_FIT_LOG_ROOM_KEY = "mycloset:active-fit-log-room";
const FIT_LOG_INVITE_PATH_PREFIX = "/fit-log/invite/";

function requiresLogin(path) {
  return (
    path === "/closet" ||
    path.startsWith("/closet/") ||
    path === "/styling" ||
    path.startsWith("/styling/") ||
    path === "/fit-log" ||
    path === "/fit-log/room" ||
    path.startsWith(FIT_LOG_INVITE_PATH_PREFIX)
  );
}

function isFitLogInvitePath(path) {
  return path.startsWith(FIT_LOG_INVITE_PATH_PREFIX);
}

function getFitLogInviteCode(path) {
  if (!isFitLogInvitePath(path)) {
    return "";
  }

  const encodedCode = path.slice(FIT_LOG_INVITE_PATH_PREFIX.length);
  if (!encodedCode || encodedCode.includes("/")) {
    return "";
  }

  try {
    return decodeURIComponent(encodedCode).trim();
  } catch {
    return "";
  }
}

function getFitLogInvitePath(roomCode) {
  return `${FIT_LOG_INVITE_PATH_PREFIX}${encodeURIComponent(roomCode)}`;
}

function readPendingFitLogInvite() {
  try {
    return window.sessionStorage.getItem(PENDING_FIT_LOG_INVITE_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

function savePendingFitLogInvite(roomCode) {
  try {
    window.sessionStorage.setItem(PENDING_FIT_LOG_INVITE_KEY, roomCode);
  } catch {
    // Session storage may be unavailable in restricted browser contexts.
  }
}

function clearPendingFitLogInvite() {
  try {
    window.sessionStorage.removeItem(PENDING_FIT_LOG_INVITE_KEY);
  } catch {
    // Nothing else is required when session storage is unavailable.
  }
}

function readActiveFitLogRoom() {
  try {
    const storedRoom = window.sessionStorage.getItem(ACTIVE_FIT_LOG_ROOM_KEY);
    if (!storedRoom) {
      return null;
    }

    const room = JSON.parse(storedRoom);
    return room && typeof room === "object" && (room.code || room.id) ? room : null;
  } catch {
    return null;
  }
}

function saveActiveFitLogRoom(room) {
  try {
    window.sessionStorage.setItem(ACTIVE_FIT_LOG_ROOM_KEY, JSON.stringify(room));
  } catch {
    // The room is still available until the current page is refreshed.
  }
}

function clearActiveFitLogRoom() {
  try {
    window.sessionStorage.removeItem(ACTIVE_FIT_LOG_ROOM_KEY);
  } catch {
    // Nothing else is required when session storage is unavailable.
  }
}

function FitLogInviteLoadingPage({ isLoading }) {
  return (
    <main className="fit-log-main">
      <section className="fit-log-panel fit-log-invite-loading" role="status" aria-live="polite">
        <h1>핏로그 초대</h1>
        <p>{isLoading ? "초대받은 방에 참여하고 있어요." : "초대 링크를 확인하고 있어요."}</p>
      </section>
    </main>
  );
}

function App() {
  const [path, setPath] = React.useState(getPathname);
  const [currentUser, setCurrentUser] = React.useState(getCurrentUser);
  const [activeFitRoom, setActiveFitRoom] = React.useState(readActiveFitLogRoom);
  const [stylingDraft, setStylingDraft] = React.useState(null);
  const [stylingNotice, setStylingNotice] = React.useState("");
  const [dailyLookResult, setDailyLookResult] = React.useState(null);
  const [isFitLogInviteLoading, setIsFitLogInviteLoading] = React.useState(false);
  const [fitLogInviteError, setFitLogInviteError] = React.useState("");
  const [fitLogInviteSuccess, setFitLogInviteSuccess] = React.useState("");
  const fitLogInviteRequestRef = React.useRef(null);

  React.useEffect(() => {
    function handlePopState() {
      setPath(getPathname());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  React.useEffect(() => {
    let active = true;

    fetchCurrentUser().then((user) => {
      if (active && user) {
        setCurrentUser(user);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function navigate(nextPath) {
    navigateTo(path, nextPath, setPath);
  }

  function setCurrentFitLogRoom(room) {
    setActiveFitRoom(room);

    if (room) {
      saveActiveFitLogRoom(room);
      return;
    }

    clearActiveFitLogRoom();
  }

  React.useEffect(() => {
    if (path === "/admin" && currentUser?.role !== "ADMIN") {
      navigateTo(path, "/", setPath);
    }
  }, [currentUser, path]);

  React.useEffect(() => {
    if (!currentUser && requiresLogin(path)) {
      const roomCode = getFitLogInviteCode(path);
      if (roomCode) {
        savePendingFitLogInvite(roomCode);
      }
      navigateTo(path, "/login", setPath);
    }
  }, [currentUser, path]);

  React.useEffect(() => {
    if (currentUser && path === "/fit-log/room" && !activeFitRoom) {
      navigateTo(path, "/fit-log", setPath);
    }
  }, [activeFitRoom, currentUser, path]);

  React.useEffect(() => {
    if (!currentUser || path !== "/login") {
      return;
    }

    const pendingRoomCode = readPendingFitLogInvite();
    if (!pendingRoomCode) {
      return;
    }

    setIsFitLogInviteLoading(true);
    setFitLogInviteError("");
    navigateTo(path, getFitLogInvitePath(pendingRoomCode), setPath);
  }, [currentUser, path]);

  function requestFitLogInviteJoin(user, roomCode) {
    const userKey = user?.id || user?.email || user?.nickname || "";
    const existingRequest = fitLogInviteRequestRef.current;

    if (existingRequest?.roomCode === roomCode && existingRequest.userKey === userKey) {
      return existingRequest.promise;
    }

    const promise = (async () => {
      const room = await prepareFitRoomJoinByCode(roomCode);
      if (!room) {
        throw new Error("초대받은 핏로그 방을 찾을 수 없습니다.");
      }

      const joinedRoom = await joinFitRoom(user, room);
      if (!joinedRoom) {
        throw new Error("핏로그 방에 참여하지 못했습니다.");
      }

      return joinedRoom;
    })();

    fitLogInviteRequestRef.current = { roomCode, userKey, promise };
    promise.catch(() => {
      if (fitLogInviteRequestRef.current?.promise === promise) {
        fitLogInviteRequestRef.current = null;
      }
    });

    return promise;
  }

  function handleFitLogInviteFailure(originPath, error) {
    clearPendingFitLogInvite();
    setCurrentFitLogRoom(null);
    setFitLogInviteSuccess("");
    setFitLogInviteError(error?.message || "핏로그 방에 참여하지 못했습니다.");
    navigateTo(originPath, "/fit-log", setPath);
  }

  React.useEffect(() => {
    if (!currentUser || !isFitLogInvitePath(path)) {
      return undefined;
    }

    const roomCode = getFitLogInviteCode(path);
    if (!roomCode) {
      handleFitLogInviteFailure(path, new Error("올바르지 않은 핏로그 초대 링크입니다."));
      return undefined;
    }

    let cancelled = false;
    setIsFitLogInviteLoading(true);
    setFitLogInviteError("");

    requestFitLogInviteJoin(currentUser, roomCode)
      .then((joinedRoom) => {
        if (cancelled) {
          return;
        }

        clearPendingFitLogInvite();
        setCurrentFitLogRoom(joinedRoom);
        setFitLogInviteSuccess(`“${joinedRoom.name || "핏로그"}” 방에 참여했습니다.`);
        navigateTo(path, "/fit-log/room", setPath);
      })
      .catch((error) => {
        if (!cancelled) {
          handleFitLogInviteFailure(path, error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFitLogInviteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, path]);

  function handleLogin(user) {
    setCurrentUser(user);
    const pendingRoomCode = readPendingFitLogInvite();

    if (!pendingRoomCode) {
      navigate("/");
      return;
    }

    setIsFitLogInviteLoading(true);
    setFitLogInviteError("");
    navigateTo(path, getFitLogInvitePath(pendingRoomCode), setPath);
  }

  function handleLogout() {
    logoutUser();
    setCurrentUser(null);
    setCurrentFitLogRoom(null);
    setDailyLookResult(null);
    navigate("/");
  }

  const page = path === "/login" ? "login" : path === "/signup" ? "signup" : "home";

  let currentPage;

  if (!currentUser && requiresLogin(path)) {
    currentPage = null;
  } else if (path === "/signup") {
    currentPage = <SignupPage onLogin={() => navigate("/login")} />;
  } else if (path === "/login") {
    currentPage = <LoginPage onLogin={handleLogin} onSignup={() => navigate("/signup")} />;
  } else if (path === "/closet") {
    currentPage = <ClosetPage user={currentUser} onLogin={() => navigate("/login")} />;
  } else if (path === "/closet/add") {
    currentPage = <ComingSoonPage title="옷 등록" />;
  } else if (path === "/styling") {
    currentPage = (
      <StylingPage
        user={currentUser}
        onLogin={() => navigate("/login")}
        onAdd={() => {
          setStylingNotice("");
          navigate("/styling/add");
        }}
        onEdit={(stylingId) => navigate(`/styling/edit/${encodeURIComponent(stylingId)}`)}
        notice={stylingNotice}
        onNoticeDismiss={() => setStylingNotice("")}
      />
    );
  } else if (path === "/styling/add") {
    currentPage = (
      <StylingAddPage
        user={currentUser}
        initialStyling={stylingDraft}
        onLogin={() => navigate("/login")}
        onCancel={() => {
          setStylingDraft(null);
          navigate("/styling");
        }}
        onSaved={(notice) => {
          setStylingDraft(null);
          setStylingNotice(notice || "");
          navigate("/styling");
        }}
      />
    );
  } else if (path.startsWith("/styling/edit/")) {
    currentPage = (
      <StylingAddPage
        user={currentUser}
        stylingId={decodeURIComponent(path.replace("/styling/edit/", ""))}
        onLogin={() => navigate("/login")}
        onCancel={() => navigate("/styling")}
        onSaved={(notice) => {
          setStylingNotice(notice || "");
          navigate("/styling");
        }}
      />
    );
  } else if (path === "/daily-look") {
    currentPage = (
      <DailyLookPage
        user={currentUser}
        onLogin={() => navigate("/login")}
        onCloset={() => navigate("/closet")}
        onShowResult={(result) => {
          setDailyLookResult(result);
          navigate("/daily-look/result");
        }}
      />
    );
  } else if (path === "/daily-look/result") {
    currentPage = (
      <DailyLookResultPage
        user={currentUser}
        result={dailyLookResult}
        onRetry={() => {
          setDailyLookResult(null);
          navigate("/daily-look");
        }}
        onSaveLook={(draft) => {
          setStylingDraft(draft);
          navigate("/styling/add");
        }}
      />
    );
  } else if (path === "/fit-log") {
    currentPage = (
      <FitLogPage
        user={currentUser}
        notice={fitLogInviteError}
        onNoticeDismiss={() => setFitLogInviteError("")}
        onEnterRoom={(room) => {
          setFitLogInviteError("");
          setFitLogInviteSuccess("");
          setCurrentFitLogRoom(room);
          navigate("/fit-log/room");
        }}
      />
    );
  } else if (isFitLogInvitePath(path)) {
    currentPage = <FitLogInviteLoadingPage isLoading={isFitLogInviteLoading} />;
  } else if (path === "/fit-log/room") {
    currentPage = activeFitRoom ? (
      <FitLogRoomPage
        user={currentUser}
        room={activeFitRoom}
        entryNotice={fitLogInviteSuccess}
        onEntryNoticeDismiss={() => setFitLogInviteSuccess("")}
        onExitRoom={() => {
          setCurrentFitLogRoom(null);
          navigate("/fit-log");
        }}
      />
    ) : (
      <FitLogInviteLoadingPage isLoading={false} />
    );
  } else if (path === "/board") {
    currentPage = <BoardPage user={currentUser} onLogin={() => navigate("/login")} />;
  } else if (path === "/mypage") {
    currentPage = (
      <MyPage
        user={currentUser}
        onLogin={() => navigate("/login")}
        onUpdated={setCurrentUser}
        onDeleted={() => {
          setCurrentUser(null);
          navigate("/");
        }}
      />
    );
  } else if (path === "/admin") {
    currentPage =
      currentUser?.role === "ADMIN" ? (
        <AdminPage user={currentUser} onHome={() => navigate("/")} onUserUpdated={setCurrentUser} />
      ) : (
        <HomePage user={currentUser} onStart={() => navigate(currentUser ? "/closet" : "/login")} />
      );
  } else if (routeTitles[path]) {
    currentPage = <ComingSoonPage title={routeTitles[path]} />;
  } else {
    currentPage = (
      <HomePage user={currentUser} onStart={() => navigate(currentUser ? "/closet" : "/login")} />
    );
  }

  return (
    <div className="page">
      <Header
        page={page}
        path={path}
        user={currentUser}
        navItems={navItems}
        onHome={() => navigate("/")}
        onLogin={() => navigate("/login")}
        onLogout={handleLogout}
        onNavigate={navigate}
      />
      {currentPage}
      <Footer compact={page !== "home"} />
    </div>
  );
}

export default App;
