import React from "react";
import "./StylingPage.css";
import Modal from "../components/Modal.jsx";
import { fetchMyClothes } from "../utils/clothes.js";
import { fetchStyling, saveStyling, updateStyling } from "../utils/stylings.js";
import backButtonImage from "../../img/back-button.png";
import stylingAccessoryImage from "../../img/styling-accessory2.png";
import stylingBottomImage from "../../img/styling-bottom.png";
import stylingHatImage from "../../img/styling-hat.png";
import stylingOuterImage from "../../img/styling-outer.png";
import stylingShoesImage from "../../img/styling-shoes.png";
import stylingTopImage from "../../img/styling-top.png";

const stylingSlots = [
  { key: "hat", label: "머리 액세서리", image: stylingHatImage, categories: ["ACCESSORY"] },
  { key: "accessoryTop", label: "액세서리", image: stylingAccessoryImage, categories: ["ACCESSORY", "BAG"] },
  { key: "top", label: "상의", image: stylingTopImage, categories: ["TOP", "DRESS"] },
  { key: "outer", label: "아우터", image: stylingOuterImage, categories: ["OUTER"] },
  { key: "bottom", label: "하의", image: stylingBottomImage, categories: ["BOTTOM"] },
  {
    key: "accessoryBottom",
    label: "액세서리",
    image: stylingAccessoryImage,
    categories: ["ACCESSORY", "BAG"],
  },
  { key: "shoes", label: "신발", image: stylingShoesImage, categories: ["SHOES"] },
  {
    key: "accessoryShoes",
    label: "액세서리",
    image: stylingAccessoryImage,
    categories: ["ACCESSORY", "BAG"],
  },
];

function matchesSlot(item, slot) {
  const category = String(item.category || "").toUpperCase();
  const subcategory = String(item.subcategory || item.subCategory || "").toUpperCase();

  if (!slot.categories.includes(category)) return false;
  if (!slot.subcategories) return true;

  return slot.subcategories.includes(subcategory) || category === "ACCESSORY";
}

function getClothesName(item) {
  return item.name || item.alias || "이름 없는 옷";
}

function getStylingItems(styling) {
  return {
    ...(styling?.items || {}),
    ...(styling?.top ? { top: styling.top } : {}),
    ...(styling?.bottom ? { bottom: styling.bottom } : {}),
  };
}

function StylingAddPage({ user, stylingId, initialStyling, onLogin, onCancel, onSaved }) {
  const [name, setName] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [error, setError] = React.useState("");
  const [clothes, setClothes] = React.useState([]);
  const [clothesStatus, setClothesStatus] = React.useState(user ? "loading" : "idle");
  const [selectedItems, setSelectedItems] = React.useState({});
  const [activeSlotKey, setActiveSlotKey] = React.useState("");
  const [pendingItem, setPendingItem] = React.useState(null);
  const [editingStyling, setEditingStyling] = React.useState(stylingId ? undefined : null);
  const [stylingLoadError, setStylingLoadError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const canSave = name.trim().length > 0;
  const isEditMode = Boolean(stylingId);

  const activeSlot = stylingSlots.find((slot) => slot.key === activeSlotKey);
  const filteredClothes = activeSlot ? clothes.filter((item) => matchesSlot(item, activeSlot)) : [];

  React.useEffect(() => {
    if (!user) {
      setClothes([]);
      setClothesStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    setClothesStatus("loading");

    fetchMyClothes(user, { signal: controller.signal })
      .then((items) => {
        setClothes(items);
        setClothesStatus("ready");
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setClothes([]);
          setClothesStatus("error");
        }
      });

    return () => controller.abort();
  }, [user]);

  React.useEffect(() => {
    if (!user || !stylingId) {
      setEditingStyling(null);
      if (!stylingId) {
        setName(initialStyling?.name || "");
        setMemo(initialStyling?.memo || "");
        setSelectedItems(getStylingItems(initialStyling));
      }
      return;
    }

    const controller = new AbortController();
    setEditingStyling(undefined);
    setStylingLoadError("");

    fetchStyling(user, stylingId, { signal: controller.signal })
      .then((styling) => {
        setEditingStyling(styling || null);
        setName(styling?.name || "");
        setMemo(styling?.memo || "");
        setSelectedItems(getStylingItems(styling));
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setEditingStyling(null);
          setStylingLoadError(fetchError.message || "코디 정보를 불러오지 못했습니다.");
        }
      });

    return () => controller.abort();
  }, [initialStyling, stylingId, user]);

  function openPicker(slot) {
    setActiveSlotKey(slot.key);
    setPendingItem(selectedItems[slot.key] || null);
  }

  function closePicker() {
    setActiveSlotKey("");
    setPendingItem(null);
  }

  function confirmPicker() {
    if (!activeSlot || !pendingItem) return;

    setSelectedItems((current) => ({
      ...current,
      [activeSlot.key]: pendingItem,
    }));
    closePicker();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSave) {
      setError("코디 이름을 입력해 주세요.");
      return;
    }

    const stylingValues = {
      name,
      memo,
      items: selectedItems,
    };

    setError("");
    setIsSaving(true);

    try {
      if (isEditMode) {
        await updateStyling(user, stylingId, stylingValues);
      } else {
        await saveStyling(user, stylingValues);
      }
      onSaved(isEditMode ? "수정되었습니다." : "저장되었습니다.");
    } catch (saveError) {
      setError(saveError.message || "코디를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="closet-main styling-main">
        <h1>코디하기</h1>
        <section className="closet-content">
          <div className="closet-empty">
            <p>로그인하고 코디를 추가해 보세요.</p>
            <button type="button" className="closet-login-button" onClick={onLogin}>
              로그인하기
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (isEditMode && editingStyling === undefined) {
    return (
      <main className="closet-main styling-main styling-add-main">
        <h1>코디하기</h1>
        <section className="closet-content">
          <p className="closet-message">코디 정보를 불러오는 중입니다.</p>
        </section>
      </main>
    );
  }

  if (isEditMode && !editingStyling) {
    return (
      <main className="closet-main styling-main styling-add-main">
        <button
          type="button"
          className="styling-back-button"
          aria-label="코디 목록으로 돌아가기"
          onClick={onCancel}
        >
          <img src={backButtonImage} alt="" />
        </button>
        <h1>코디하기</h1>
        <section className="closet-content">
          <p className="closet-message">{stylingLoadError || "수정할 코디를 찾을 수 없습니다."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="closet-main styling-main styling-add-main">
      <button
        type="button"
        className="styling-back-button"
        aria-label={
          isEditMode ? "코디 수정 취소하고 목록으로 돌아가기" : "코디 만들기 취소하고 목록으로 돌아가기"
        }
        onClick={onCancel}
      >
        <img src={backButtonImage} alt="" />
      </button>
      <h1>코디하기</h1>
      <form className="styling-add-panel" onSubmit={handleSubmit}>
        <div className="styling-slot-grid" aria-label="코디 구성">
          {stylingSlots.map((slot) => {
            const selectedItem = selectedItems[slot.key];
            return (
              <button
                type="button"
                className={`styling-slot ${selectedItem ? "has-selected-item" : ""}`.trim()}
                key={slot.key}
                aria-label={`${slot.label} 선택하기`}
                onClick={() => openPicker(slot)}
              >
                <img
                  src={selectedItem?.imageUrl || slot.image}
                  alt=""
                  className={selectedItem?.imageUrl ? "styling-slot-selected-image" : ""}
                />
              </button>
            );
          })}
        </div>
        <div className="styling-form-fields">
          <label>
            <span>코디 이름</span>
            <input
              type="text"
              value={name}
              maxLength="30"
              placeholder="코디 이름"
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
            />
          </label>
          <label>
            <span>메모</span>
            <textarea
              value={memo}
              maxLength="200"
              placeholder="코디 메모"
              onChange={(event) => setMemo(event.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="styling-save-button" disabled={!canSave || isSaving}>
            {isSaving ? "저장 중..." : isEditMode ? "수정" : "저장"}
          </button>
        </div>
      </form>
      <Modal
        isOpen={Boolean(activeSlot)}
        titleId="styling-picker-title"
        onClose={closePicker}
        onConfirm={confirmPicker}
        className="styling-picker-modal"
      >
        {activeSlot && (
          <>
            <h2 id="styling-picker-title">{activeSlot.label}</h2>
            <div className="styling-picker-list" aria-live="polite">
              {clothesStatus === "loading" && (
                <p className="styling-picker-message">옷을 불러오는 중입니다.</p>
              )}
              {clothesStatus === "error" && (
                <p className="styling-picker-message">옷 목록을 불러오지 못했습니다.</p>
              )}
              {clothesStatus === "ready" && filteredClothes.length === 0 && (
                <p className="styling-picker-message">선택할 수 있는 옷이 없습니다.</p>
              )}
              {clothesStatus === "ready" &&
                filteredClothes.map((item) => (
                  <button
                    type="button"
                    className={`styling-picker-card ${
                      String(pendingItem?.id) === String(item.id) ? "is-selected" : ""
                    }`.trim()}
                    key={item.id}
                    onClick={() => setPendingItem(item)}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={getClothesName(item)} />
                    ) : (
                      <span className="styling-picker-placeholder" aria-hidden="true">
                        MY CLOSET
                      </span>
                    )}
                    <span>{getClothesName(item)}</span>
                  </button>
                ))}
            </div>
            <div className="styling-picker-actions">
              <button type="button" className="styling-picker-close" onClick={closePicker}>
                닫기
              </button>
              <button
                type="button"
                className="styling-picker-confirm"
                disabled={!pendingItem}
                onClick={confirmPicker}
              >
                선택
              </button>
            </div>
          </>
        )}
      </Modal>
    </main>
  );
}

export default StylingAddPage;
