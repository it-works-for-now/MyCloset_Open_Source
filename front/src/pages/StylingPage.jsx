import React from "react";
import "./StylingPage.css";
import Modal from "../components/Modal.jsx";
import ScrollTopButton from "../components/ScrollTopButton.jsx";
import { deleteStyling, fetchSavedStylings } from "../utils/stylings.js";
import addButtonImage from "../../img/add-button.png";
import searchButtonImage from "../../img/search-button.png";
import stylingAccessoryImage from "../../img/styling-accessory2.png";
import stylingBottomImage from "../../img/styling-bottom.png";
import stylingHatImage from "../../img/styling-hat.png";
import stylingOuterImage from "../../img/styling-outer.png";
import stylingShoesImage from "../../img/styling-shoes.png";
import stylingTopImage from "../../img/styling-top.png";

const stylingSlots = [
  { key: "hat", label: "머리 액세서리", image: stylingHatImage },
  { key: "accessoryTop", label: "액세서리", image: stylingAccessoryImage },
  { key: "top", label: "상의", image: stylingTopImage },
  { key: "outer", label: "아우터", image: stylingOuterImage },
  { key: "bottom", label: "하의", image: stylingBottomImage },
  { key: "accessoryBottom", label: "액세서리", image: stylingAccessoryImage },
  { key: "shoes", label: "신발", image: stylingShoesImage },
  { key: "accessoryShoes", label: "액세서리", image: stylingAccessoryImage },
];

function getStylingItems(styling) {
  return {
    ...(styling.items || {}),
    ...(styling.top ? { top: styling.top } : {}),
    ...(styling.bottom ? { bottom: styling.bottom } : {}),
  };
}

function getItemName(item, fallback) {
  return item?.name || item?.alias || fallback;
}

function getStylingMemo(styling) {
  return String(styling?.memo || "").trim();
}

function StylingCard({ styling, onSelect }) {
  const items = getStylingItems(styling);
  const topImage = items.top?.imageUrl || stylingTopImage;
  const bottomImage = items.bottom?.imageUrl || stylingBottomImage;
  const topName = getItemName(items.top, "상의");
  const bottomName = getItemName(items.bottom, "하의");
  const memo = getStylingMemo(styling);

  return (
    <article
      className="clothes-card styling-card"
      tabIndex={0}
      role="button"
      onClick={() => onSelect(styling)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(styling);
        }
      }}
    >
      <div className="styling-card-items" aria-label={`${styling.name} 코디 구성`}>
        <img src={topImage} alt={topName} />
        <img src={bottomImage} alt={bottomName} />
      </div>
      <div className="styling-card-copy">
        <h2 title={styling.name}>{styling.name}</h2>
        {memo && <p>{memo}</p>}
      </div>
    </article>
  );
}

function StylingSlotPreview({ styling }) {
  const items = getStylingItems(styling);

  return (
    <div className="styling-detail-slot-grid" aria-label="코디 구성">
      {stylingSlots.map((slot) => {
        const item = items[slot.key];
        return (
          <div className={`styling-detail-slot ${item ? "has-selected-item" : ""}`.trim()} key={slot.key}>
            <img
              src={item?.imageUrl || slot.image}
              alt={item ? getItemName(item, slot.label) : slot.label}
              className={item?.imageUrl ? "styling-detail-selected-image" : ""}
            />
          </div>
        );
      })}
    </div>
  );
}

function StylingPage({ user, onLogin, onAdd, onEdit, notice = "", onNoticeDismiss }) {
  const [query, setQuery] = React.useState("");
  const [stylings, setStylings] = React.useState([]);
  const [stylingsStatus, setStylingsStatus] = React.useState(user ? "loading" : "idle");
  const [stylingsError, setStylingsError] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);
  const [selectedStyling, setSelectedStyling] = React.useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [detailError, setDetailError] = React.useState("");
  const [actionNotice, setActionNotice] = React.useState("");

  React.useEffect(() => {
    if (!notice) return;

    setActionNotice(notice);
    onNoticeDismiss?.();
  }, [notice, onNoticeDismiss]);

  React.useEffect(() => {
    if (!actionNotice) return undefined;

    const timeoutId = window.setTimeout(() => setActionNotice(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [actionNotice]);

  React.useEffect(() => {
    if (!user) {
      setStylings([]);
      setStylingsStatus("idle");
      setStylingsError("");
      return undefined;
    }

    const controller = new AbortController();
    setStylingsStatus("loading");
    setStylingsError("");

    fetchSavedStylings(user, { signal: controller.signal })
      .then((items) => {
        setStylings(items);
        setStylingsStatus("ready");
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setStylings([]);
          setStylingsStatus("error");
          setStylingsError(fetchError.message || "코디 목록을 불러오지 못했습니다.");
        }
      });

    return () => controller.abort();
  }, [reloadKey, user]);

  const visibleStylings = stylings.filter((styling) =>
    styling.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const selectedStylingMemo = getStylingMemo(selectedStyling);

  function openDetailModal(styling) {
    setDetailError("");
    setSelectedStyling(styling);
  }

  function closeDetailModal() {
    setSelectedStyling(null);
    setIsDeleteConfirmOpen(false);
    setDetailError("");
  }

  async function confirmDeleteStyling() {
    if (!selectedStyling) return;

    setIsDeleting(true);
    setDetailError("");

    try {
      await deleteStyling(user, selectedStyling.id);
      setStylings((current) =>
        current.filter((styling) => String(styling.id) !== String(selectedStyling.id))
      );
      closeDetailModal();
      setActionNotice("삭제되었습니다.");
    } catch (deleteError) {
      setDetailError(deleteError.message || "코디를 삭제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEditButton() {
    if (!selectedStyling) return;
    onEdit(selectedStyling.id);
  }

  if (!user) {
    return (
      <main className="closet-main styling-main">
        <h1>코디하기</h1>
        <section className="closet-content">
          <div className="closet-empty">
            <p>로그인하고 저장한 코디를 확인해 보세요.</p>
            <button type="button" className="closet-login-button" onClick={onLogin}>
              로그인하기
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="closet-main styling-main">
      <h1>코디하기</h1>
      <div className="closet-tools styling-tools">
        <div className="closet-search styling-search">
          <input
            type="search"
            value={query}
            placeholder="이름으로 코디 검색"
            aria-label="이름으로 코디 검색"
            onChange={(event) => setQuery(event.target.value)}
          />
          <img src={searchButtonImage} alt="" />
        </div>
      </div>
      <section className="closet-content" aria-live="polite">
        <h2 className="styling-list-title">나의 코디 목록</h2>
        {stylingsStatus === "loading" && <p className="closet-message">코디 목록을 불러오는 중입니다.</p>}
        {stylingsStatus === "error" && (
          <div className="closet-empty">
            <p>{stylingsError}</p>
            <button
              type="button"
              className="closet-login-button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              다시 시도
            </button>
          </div>
        )}
        {stylingsStatus === "ready" && stylings.length === 0 && (
          <p className="closet-message">저장한 코디가 없습니다.</p>
        )}
        {stylingsStatus === "ready" && stylings.length > 0 && visibleStylings.length === 0 && (
          <p className="closet-message">검색 결과가 없습니다.</p>
        )}
        {stylingsStatus === "ready" && visibleStylings.length > 0 && (
          <div className="clothes-grid styling-grid">
            {visibleStylings.map((styling) => (
              <StylingCard key={styling.id} styling={styling} onSelect={openDetailModal} />
            ))}
          </div>
        )}
      </section>
      <button type="button" className="closet-add-button" aria-label="코디 추가하기" onClick={onAdd}>
        <img src={addButtonImage} alt="" />
      </button>
      <ScrollTopButton className="closet-top-button" />
      {actionNotice && (
        <p className="closet-save-notice styling-action-notice" role="status" aria-live="polite">
          {actionNotice}
        </p>
      )}
      <Modal
        isOpen={Boolean(selectedStyling)}
        titleId="styling-detail-title"
        onClose={closeDetailModal}
        onConfirm={() => {}}
        className="styling-detail-modal"
      >
        {selectedStyling && (
          <div className="styling-detail-content">
            <h2 id="styling-detail-title" className="visually-hidden">
              코디 정보
            </h2>
            <StylingSlotPreview styling={selectedStyling} />
            <div className="styling-detail-fields">
              <dl className="styling-detail-summary">
                <div className="styling-detail-summary-item">
                  <dt>이름</dt>
                  <dd className="styling-detail-name">{selectedStyling.name || "이름 없는 코디"}</dd>
                </div>
                <div className="styling-detail-summary-item">
                  <dt>메모</dt>
                  <dd className={`styling-detail-memo ${selectedStylingMemo ? "" : "is-empty"}`.trim()}>
                    {selectedStylingMemo || "등록한 메모가 없습니다."}
                  </dd>
                </div>
              </dl>
              {detailError && <p className="form-error">{detailError}</p>}
              <div className="styling-detail-actions">
                <button
                  type="button"
                  className="styling-detail-delete"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isDeleting}
                >
                  삭제
                </button>
                <button
                  type="button"
                  className="styling-detail-edit"
                  onClick={handleEditButton}
                  disabled={isDeleting}
                >
                  수정
                </button>
                <button type="button" className="styling-detail-close" onClick={closeDetailModal}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={isDeleteConfirmOpen}
        titleId="delete-styling-title"
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteStyling}
        className="styling-delete-confirm-modal"
      >
        <h2 id="delete-styling-title">이 코디를 삭제할까요?</h2>
        <p>삭제한 코디는 되돌릴 수 없습니다.</p>
        <div className="styling-delete-confirm-actions">
          <button
            type="button"
            className="styling-delete-cancel"
            onClick={() => setIsDeleteConfirmOpen(false)}
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            type="button"
            className="styling-delete-confirm"
            onClick={confirmDeleteStyling}
            disabled={isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제하기"}
          </button>
        </div>
      </Modal>
    </main>
  );
}

export default StylingPage;
