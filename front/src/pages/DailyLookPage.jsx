import React from "react";
import "./DailyLookPage.css";
import { SparkleIcon } from "../components/icons.jsx";
import sendButton from "../../img/send-button.png";
import weatherSunnyImage from "../../img/weather-sunny.png";
import weatherPartlyCloudyImage from "../../img/weather-partly-cloudy.png";
import weatherCloudyImage from "../../img/weather-cloudy.png";
import weatherRainyImage from "../../img/weather-rainy.png";
import weatherSnowyImage from "../../img/weather-snowy.png";
import { fetchCurrentWeather, recommendDailyLookWithOptions } from "../utils/dailyLook.js";

const CLOSET_REGISTER_MESSAGE = "옷장에 등록된 옷이 없습니다. 먼저 옷장에 옷을 등록해 주세요.";
const EMPTY_CLOSET_BACKEND_MESSAGE = "옷장에 등록된 옷이 없습니다. 먼저 옷을 등록해주세요.";
const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const weatherIcons = {
  sunny: weatherSunnyImage,
  "partly-cloudy": weatherPartlyCloudyImage,
  cloudy: weatherCloudyImage,
  rainy: weatherRainyImage,
  snowy: weatherSnowyImage,
};

const defaultWeather = {
  status: "sunny",
  label: "날씨",
  currentTemp: null,
  minTemp: null,
  maxTemp: null,
};

function getInitialMessages(userName, isLoggedIn) {
  if (isLoggedIn) {
    return [];
  }

  return [
    { id: "user-ready", sender: "user", text: "ex) 가을철 룩 추천해줘", isExample: true },
    {
      id: "ai-ready",
      sender: "ai",
      text: `ex) 네, ${userName}님의 옷들로 가을철 룩을 추천드리겠습니다.`,
      isExample: true,
    },
  ];
}

function isClosetRegisterError(error) {
  return error?.status === 400 && error?.message === EMPTY_CLOSET_BACKEND_MESSAGE;
}

function roundTemp(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
}

function getWeatherStatus(condition = "") {
  const normalizedCondition = String(condition).toLowerCase();

  if (normalizedCondition.includes("눈") || normalizedCondition.includes("snow")) {
    return { status: "snowy", label: "눈" };
  }

  if (
    normalizedCondition.includes("비") ||
    normalizedCondition.includes("소나기") ||
    normalizedCondition.includes("rain") ||
    normalizedCondition.includes("drizzle") ||
    normalizedCondition.includes("thunderstorm")
  ) {
    return { status: "rainy", label: "비" };
  }

  if (
    normalizedCondition.includes("약간") ||
    normalizedCondition.includes("조금") ||
    normalizedCondition.includes("튼구름") ||
    normalizedCondition.includes("few") ||
    normalizedCondition.includes("scattered")
  ) {
    return { status: "partly-cloudy", label: "약간 흐림" };
  }

  if (
    normalizedCondition.includes("구름") ||
    normalizedCondition.includes("흐림") ||
    normalizedCondition.includes("cloud") ||
    normalizedCondition.includes("overcast")
  ) {
    return { status: "cloudy", label: "흐림" };
  }

  return { status: "sunny", label: "맑음" };
}

function normalizeWeather(data) {
  const status = getWeatherStatus(data?.condition);

  return {
    ...status,
    currentTemp: roundTemp(data?.temp),
    minTemp: roundTemp(data?.tempMin),
    maxTemp: roundTemp(data?.tempMax),
  };
}

function createWeatherSummary(weather) {
  return `${weather.label}, 현재 ${weather.currentTemp}°C, 최저 ${weather.minTemp}° / 최고 ${weather.maxTemp}°`;
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저에서는 위치 정보를 사용할 수 없습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function DailyLookPage({ user, onShowResult, onLogin, onCloset }) {
  const userName = user?.nickname || "사용자";
  const isLoggedIn = Boolean(user);
  const requestRef = React.useRef(null);
  const lastRequestRef = React.useRef(null);
  const [messages, setMessages] = React.useState(() => getInitialMessages(userName, isLoggedIn));
  const [prompt, setPrompt] = React.useState("");
  const [shouldConsiderWeather, setShouldConsiderWeather] = React.useState(false);
  const [weatherState, setWeatherState] = React.useState({
    status: "idle",
    data: defaultWeather,
    coords: null,
    message: "",
  });
  const [isRecommending, setIsRecommending] = React.useState(false);
  const [recommendError, setRecommendError] = React.useState("");
  const showEmptyGuide = isLoggedIn && messages.length === 0;

  React.useEffect(() => {
    setMessages(getInitialMessages(userName, isLoggedIn));
    setIsRecommending(false);
    setRecommendError("");
  }, [isLoggedIn, userName]);

  React.useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (!isLoggedIn) {
      setWeatherState({
        status: "idle",
        data: defaultWeather,
        coords: null,
        message: "",
      });
      setShouldConsiderWeather(false);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    let isLoadingWeather = false;
    let shouldKeepRefreshing = true;
    let weatherRefreshTimer;

    async function loadWeather() {
      if (!shouldKeepRefreshing || isLoadingWeather) {
        return;
      }

      isLoadingWeather = true;
      setWeatherState((current) => ({
        ...current,
        status: "loading",
        message: "위치 확인 중",
      }));

      try {
        if (navigator.permissions?.query) {
          const permissionStatus = await navigator.permissions.query({ name: "geolocation" });
          if (permissionStatus.state === "denied") {
            throw new Error("위치 권한이 차단되어 날씨를 불러올 수 없습니다.");
          }
        }

        const position = await getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 10 * 60 * 1000,
        });

        if (cancelled) {
          return;
        }

        const { latitude, longitude } = position.coords;
        setWeatherState((current) => ({
          ...current,
          status: "loading",
          coords: { latitude, longitude },
          message: "날씨 불러오는 중",
        }));

        const weather = await fetchCurrentWeather(latitude, longitude, { signal: controller.signal });

        if (cancelled) {
          return;
        }

        setWeatherState({
          status: "ready",
          data: normalizeWeather(weather),
          coords: { latitude, longitude },
          message: "",
        });
      } catch (error) {
        if (cancelled || error.name === "AbortError") {
          return;
        }

        setWeatherState({
          status: "error",
          data: defaultWeather,
          coords: null,
          message: error.message || "날씨 정보를 불러오지 못했습니다.",
        });
        setShouldConsiderWeather(false);

        if (error.code === 1 || error.message?.includes("위치 권한") || error.message?.includes("브라우저")) {
          shouldKeepRefreshing = false;
          window.clearInterval(weatherRefreshTimer);
        }
      } finally {
        isLoadingWeather = false;
      }
    }

    loadWeather();
    weatherRefreshTimer = window.setInterval(loadWeather, WEATHER_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(weatherRefreshTimer);
      controller.abort();
    };
  }, [isLoggedIn]);

  async function submitRecommendation(trimmedPrompt, considerWeather = shouldConsiderWeather) {
    if (isRecommending) {
      return;
    }

    const canUseWeather = considerWeather && weatherState.status === "ready" && weatherState.coords;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    lastRequestRef.current = {
      prompt: trimmedPrompt,
      considerWeather,
    };

    setMessages([
      {
        id: "user-request",
        sender: "user",
        text: trimmedPrompt,
      },
      {
        id: "ai-loading",
        sender: "ai",
        text: "추천 룩 생성 중. 30~50초 정도 걸릴 수 있어요.\n완료 시 바로 추천 결과 화면으로 이동합니다.",
        isLoading: true,
      },
    ]);
    setIsRecommending(true);
    setRecommendError("");

    try {
      const response = await recommendDailyLookWithOptions(trimmedPrompt, {
        considerWeather: canUseWeather,
        latitude: canUseWeather ? weatherState.coords.latitude : undefined,
        longitude: canUseWeather ? weatherState.coords.longitude : undefined,
        signal: controller.signal,
      });
      setPrompt("");
      onShowResult({
        situation: trimmedPrompt,
        weather: canUseWeather ? createWeatherSummary(weatherState.data) : "",
        response,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      const isClosetError = isClosetRegisterError(error);
      const fallbackMessage = "데일리룩 추천을 처리하지 못했습니다. 다시 시도해 주세요.";
      const errorMessage = isClosetError ? CLOSET_REGISTER_MESSAGE : error.message || fallbackMessage;

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === "ai-loading"
            ? {
                ...message,
                id: "ai-error",
                text: errorMessage,
                actionType: isClosetError ? "closet" : "retry",
              }
            : message
        )
      );
      setRecommendError(errorMessage);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
      }
      setIsRecommending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!isLoggedIn) {
      onLogin();
      return;
    }

    if (!trimmedPrompt) {
      setRecommendError("원하는 룩을 문장으로 입력해 주세요.");
      return;
    }

    submitRecommendation(trimmedPrompt);
  }

  function handleRetry() {
    const lastRequest = lastRequestRef.current;

    if (!lastRequest?.prompt) {
      setRecommendError("추천받을 룩을 다시 입력해 주세요.");
      return;
    }

    submitRecommendation(lastRequest.prompt, lastRequest.considerWeather);
  }

  return (
    <main className="daily-look-main">
      <section className="daily-look-heading" aria-labelledby="daily-look-title">
        <h1 id="daily-look-title">데일리룩 추천</h1>
        <p>원하는 스타일을 입력하면 AI가 나의 옷장에서 딱 맞는 룩을 추천해드려요</p>
      </section>

      <section className="daily-chat-panel" aria-label="AI 데일리룩 추천 대화">
        <div className="daily-chat-messages" aria-live="polite">
          {showEmptyGuide && (
            <div className="daily-empty-guide">
              <SparkleIcon />
              <p>오늘 입고 싶은 분위기를 말해 주세요.</p>
              <span>예: 여름 데이트룩, 출근룩, 비 오는 날 편한 코디</span>
            </div>
          )}
          {messages.map((message) => (
            <div
              className={`daily-message-row ${message.sender === "user" ? "is-user" : "is-ai"}`}
              key={message.id}
            >
              <div
                className={`daily-message-bubble ${
                  message.sender === "user" ? "user-bubble" : "ai-bubble"
                } ${message.text ? "has-text" : ""} ${message.isExample ? "is-example" : ""}`}
              >
                {message.isLoading && <span className="daily-message-spinner" aria-hidden="true" />}
                {message.text}
              </div>
              {message.actionType === "retry" && (
                <button className="daily-result-button" type="button" onClick={handleRetry}>
                  재시도
                </button>
              )}
              {message.actionType === "closet" && (
                <button className="daily-result-button" type="button" onClick={onCloset}>
                  옷 등록
                </button>
              )}
            </div>
          ))}
        </div>

        <form className="daily-chat-form" onSubmit={handleSubmit}>
          {recommendError && (
            <p className="daily-recommend-error" role="alert">
              {recommendError}
            </p>
          )}
          <div className="daily-weather-bar" aria-label="오늘 날씨">
            <div className="daily-weather-summary">
              <img
                src={weatherIcons[weatherState.data.status]}
                alt={weatherState.data.label}
                className="daily-weather-icon"
              />
              {weatherState.status === "ready" ? (
                <>
                  <strong>{weatherState.data.currentTemp}°C</strong>
                  <span className="daily-weather-range-full">
                    최저 {weatherState.data.minTemp}° / 최고 {weatherState.data.maxTemp}°
                  </span>
                  <span className="daily-weather-range-short">
                    · {weatherState.data.minTemp}°/{weatherState.data.maxTemp}°
                  </span>
                </>
              ) : (
                <span className="daily-weather-message">
                  {weatherState.status === "loading"
                    ? weatherState.message
                    : weatherState.message || "날씨 정보 없음"}
                </span>
              )}
            </div>
            <label className="daily-weather-toggle">
              <input
                type="checkbox"
                checked={shouldConsiderWeather}
                disabled={weatherState.status !== "ready"}
                onChange={(event) => setShouldConsiderWeather(event.target.checked)}
              />
              <span>날씨 고려하기</span>
            </label>
          </div>
          <label className="daily-chat-input">
            <span className="sr-only">원하는 코디 입력</span>
            <input
              type="text"
              value={prompt}
              placeholder={isLoggedIn ? "원하는 룩을 입력하세요." : "로그인 후 이용해 주세요."}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <button
            className="daily-send-button"
            type="submit"
            aria-label="전송"
            disabled={isRecommending || (isLoggedIn && !prompt.trim())}
          >
            <img src={sendButton} alt="" aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  );
}

export default DailyLookPage;
