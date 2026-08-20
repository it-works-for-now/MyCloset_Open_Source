import React from "react";
import "./DailyLookResultPage.css";
import { fetchMyClothes } from "../utils/clothes.js";
import { generateDailyLookImage } from "../utils/dailyLook.js";
import backWhiteButtonImage from "../../img/back-white-button.png";

const slotLabels = {
  hat: "머리 액세서리",
  accessoryTop: "액세서리",
  top: "상의",
  outer: "아우터",
  bottom: "하의",
  accessoryBottom: "액세서리",
  shoes: "신발",
  accessoryShoes: "액세서리",
};

function getClothesId(item) {
  return item?.id ?? item?.clothesId ?? item?.clothesIdx;
}

function getClothesName(item, fallbackId) {
  return item?.name || item?.alias || item?.clothesName || `옷 #${fallbackId}`;
}

function getSlotEntries(slots) {
  return Object.entries(slots || {}).filter(([, clothesId]) => {
    return clothesId !== null && clothesId !== undefined && clothesId !== "";
  });
}

function createLookTitle(look, index) {
  return look.title || look.name || look.lookName || `추천 룩 ${index + 1}`;
}

function createLookMemo(look) {
  const keywords = Array.isArray(look.styleKeywords) ? look.styleKeywords.filter(Boolean) : [];

  return [look.reason, keywords.length > 0 ? `스타일 키워드: ${keywords.join(", ")}` : ""]
    .filter(Boolean)
    .join("\n");
}

function normalizeLook(look, index) {
  const slots = look.slots && typeof look.slots === "object" ? look.slots : {};

  return {
    ...look,
    id: look.id || look.lookId || `daily-look-${index + 1}`,
    title: createLookTitle(look, index),
    reason: look.reason || "추천 이유를 준비하지 못했습니다.",
    slots,
    styleKeywords: Array.isArray(look.styleKeywords) ? look.styleKeywords.filter(Boolean) : [],
  };
}

function getImageState(imageStates, lookId) {
  return imageStates[lookId] || { status: "idle", imageUrl: "", error: "" };
}

function RecommendedLookCard({ look, clothesById, clothesStatus, imageState, onImageRetry, onSave }) {
  const slotEntries = getSlotEntries(look.slots);
  const usedClothes = slotEntries.map(([slot, clothesId]) => {
    const clothes = clothesById.get(String(clothesId));

    return {
      slot,
      clothesId,
      clothes,
      name: getClothesName(clothes, clothesId),
    };
  });

  return (
    <article className="daily-result-card">
      <div className="daily-result-image-wrap">
        {imageState.status === "ready" && imageState.imageUrl ? (
          <img className="daily-result-image" src={imageState.imageUrl} alt={look.title} />
        ) : (
          <div className="daily-result-image daily-result-image-state" role="status">
            {imageState.status === "error" ? (
              <>
                <p>{imageState.error || "추천 룩 이미지를 생성하지 못했습니다."}</p>
                <button type="button" onClick={onImageRetry}>
                  이미지 재시도
                </button>
              </>
            ) : (
              <>
                <span className="daily-image-spinner" aria-hidden="true" />
                <p>추천 룩 이미지를 생성하고 있어요.</p>
              </>
            )}
          </div>
        )}
        <button
          className="daily-look-save-button"
          type="button"
          aria-label={`${look.title} 코디 저장`}
          onClick={() => onSave(look)}
        >
          <span>저장</span>
        </button>
      </div>
      <h2>{look.title}</h2>
      <section className="look-reason" aria-labelledby={`look-reason-${look.id}`}>
        <h3 id={`look-reason-${look.id}`}>추천 이유</h3>
        <p>{look.reason}</p>
      </section>
      <section className="used-clothes" aria-labelledby={`used-clothes-${look.id}`}>
        <h3 id={`used-clothes-${look.id}`}>사용한 옷</h3>
        {clothesStatus === "loading" && <p className="used-clothes-message">옷 정보를 불러오는 중입니다.</p>}
        {clothesStatus === "error" && <p className="used-clothes-message">옷 정보를 불러오지 못했습니다.</p>}
        {usedClothes.length === 0 && <p className="used-clothes-message">사용한 옷 정보가 없습니다.</p>}
        {usedClothes.length > 0 && (
          <ul>
            {usedClothes.map((item) => (
              <li key={`${item.slot}-${item.clothesId}`}>
                {slotLabels[item.slot] || item.slot}: {item.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function DailyLookResultPage({ user, result, onRetry, onSaveLook }) {
  const recommendations = React.useMemo(() => {
    return (result?.response?.recommendations || []).slice(0, 3).map(normalizeLook);
  }, [result]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [clothesById, setClothesById] = React.useState(() => new Map());
  const [clothesStatus, setClothesStatus] = React.useState(user ? "loading" : "idle");
  const [imageStates, setImageStates] = React.useState({});
  const [imageRetryKey, setImageRetryKey] = React.useState(0);
  const imageRequestRef = React.useRef(null);
  const currentLook = recommendations[currentIndex] || null;
  const remainingCount = Math.max(recommendations.length - currentIndex - 1, 0);
  const maxOtherLooks = Math.max(recommendations.length - 1, 0);

  React.useEffect(() => {
    setCurrentIndex(0);
    setImageStates({});
    setImageRetryKey(0);
  }, [result]);

  React.useEffect(() => {
    if (!user) {
      setClothesById(new Map());
      setClothesStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    setClothesStatus("loading");

    fetchMyClothes(user, { signal: controller.signal })
      .then((items) => {
        const nextClothesById = new Map();
        items.forEach((item) => {
          const clothesId = getClothesId(item);
          if (clothesId !== null && clothesId !== undefined && clothesId !== "") {
            nextClothesById.set(String(clothesId), item);
          }
        });
        setClothesById(nextClothesById);
        setClothesStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setClothesById(new Map());
          setClothesStatus("error");
        }
      });

    return () => controller.abort();
  }, [user]);

  React.useEffect(() => {
    if (!currentLook) {
      return undefined;
    }

    const currentImageState = getImageState(imageStates, currentLook.id);
    if (currentImageState.status === "loading" || currentImageState.status === "ready") {
      return undefined;
    }

    const items = Object.fromEntries(getSlotEntries(currentLook.slots));
    if (Object.keys(items).length === 0) {
      setImageStates((current) => ({
        ...current,
        [currentLook.id]: {
          status: "error",
          imageUrl: "",
          error: "이미지를 생성할 옷 정보가 없습니다.",
        },
      }));
      return undefined;
    }

    const controller = new AbortController();
    imageRequestRef.current?.abort();
    imageRequestRef.current = controller;
    setImageStates((current) => ({
      ...current,
      [currentLook.id]: { status: "loading", imageUrl: "", error: "" },
    }));

    generateDailyLookImage(items, currentLook.styleKeywords, { signal: controller.signal })
      .then((imageUrl) => {
        if (!imageUrl) {
          throw new Error("추천 룩 이미지 주소를 받지 못했습니다. 다시 시도해 주세요.");
        }

        setImageStates((current) => ({
          ...current,
          [currentLook.id]: { status: "ready", imageUrl, error: "" },
        }));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setImageStates((current) => ({
            ...current,
            [currentLook.id]: {
              status: "error",
              imageUrl: "",
              error: error.message || "추천 룩 이미지를 생성하지 못했습니다. 다시 시도해 주세요.",
            },
          }));
        }
      })
      .finally(() => {
        if (imageRequestRef.current === controller) {
          imageRequestRef.current = null;
        }
      });

    return () => controller.abort();
  }, [currentLook, imageRetryKey]);

  function handleShowNextLook() {
    setCurrentIndex((index) => Math.min(index + 1, recommendations.length - 1));
  }

  function handleShowPreviousLook() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  function handleImageRetry() {
    if (!currentLook) return;

    setImageStates((current) => {
      const { [currentLook.id]: _removed, ...rest } = current;
      return rest;
    });
    setImageRetryKey((key) => key + 1);
  }

  function handleSaveLook(look) {
    const items = {};

    getSlotEntries(look.slots).forEach(([slot, clothesId]) => {
      const clothes = clothesById.get(String(clothesId));
      items[slot] = clothes || { id: clothesId, clothesId, name: `옷 #${clothesId}` };
    });

    onSaveLook({
      name: look.title,
      memo: createLookMemo(look),
      items,
      sourceLookId: look.id,
      sourceLookTitle: look.title,
    });
  }

  if (!currentLook) {
    return (
      <main className="daily-result-main">
        <button
          className="daily-result-back-button"
          type="button"
          aria-label="데일리룩 추천 페이지로 이동"
          onClick={onRetry}
        >
          <img src={backWhiteButtonImage} alt="" aria-hidden="true" />
        </button>
        <section className="daily-result-heading" aria-labelledby="daily-result-title">
          <h1 id="daily-result-title">AI 추천 결과</h1>
          <p className="daily-result-copy">추천 결과를 불러오지 못했습니다.</p>
        </section>
        <button className="daily-retry-button" type="button" onClick={onRetry}>
          다시 추천받기
        </button>
      </main>
    );
  }

  return (
    <main className="daily-result-main">
      <button
        className="daily-result-back-button"
        type="button"
        aria-label="데일리룩 추천 페이지로 이동"
        onClick={onRetry}
      >
        <img src={backWhiteButtonImage} alt="" aria-hidden="true" />
      </button>
      <section className="daily-result-heading" aria-labelledby="daily-result-title">
        <h1 id="daily-result-title">AI 추천 결과</h1>
        <p className="daily-result-query">"{result?.situation || "요청한 데일리룩"}"</p>
        <p className="daily-result-copy">옷장에서 요청에 어울리는 조합을 찾아봤어요.</p>
      </section>

      <section className="daily-result-grid" aria-label="추천 룩">
        <RecommendedLookCard
          look={currentLook}
          clothesById={clothesById}
          clothesStatus={clothesStatus}
          imageState={getImageState(imageStates, currentLook.id)}
          onImageRetry={handleImageRetry}
          onSave={handleSaveLook}
        />
      </section>

      <div className="daily-result-actions">
        <button
          className="daily-retry-button daily-previous-button"
          type="button"
          onClick={handleShowPreviousLook}
          disabled={currentIndex === 0}
        >
          이전
        </button>
        <button
          className="daily-retry-button"
          type="button"
          onClick={handleShowNextLook}
          disabled={remainingCount === 0}
        >
          다른 추천 룩 {remainingCount}/{maxOtherLooks}
        </button>
      </div>
    </main>
  );
}

export default DailyLookResultPage;
