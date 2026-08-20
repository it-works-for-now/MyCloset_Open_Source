import React from "react";
import "./ClosetPage.css";
import Modal from "../components/Modal.jsx";
import ScrollTopButton from "../components/ScrollTopButton.jsx";
import {
  createClothes,
  deleteClothes,
  fetchMyClothes,
  updateClothes,
  uploadClothesImage,
} from "../utils/clothes.js";
import { analyzeGarmentImage } from "../utils/garmentAnalysis.js";
import filterButtonImage from "../../img/filter-button.png";
import addButtonImage from "../../img/add-button.png";

const categoryOptions = [
  { value: "TOP", label: "상의" },
  { value: "BOTTOM", label: "하의" },
  { value: "OUTER", label: "아우터" },
  { value: "DRESS", label: "원피스" },
  { value: "SHOES", label: "신발" },
  { value: "BAG", label: "가방" },
  { value: "ACCESSORY", label: "액세서리" },
];

const categoryTabs = [{ value: "ALL", label: "전체" }, ...categoryOptions];

const subcategoryOptions = {
  TOP: [
    { value: "TSHIRT", label: "티셔츠" },
    { value: "SHIRT", label: "셔츠" },
    { value: "BLOUSE", label: "블라우스" },
    { value: "KNIT", label: "니트" },
    { value: "HOODIE", label: "후드" },
    { value: "SWEATSHIRT", label: "맨투맨" },
  ],
  BOTTOM: [
    { value: "JEANS", label: "청바지" },
    { value: "SLACKS", label: "슬랙스" },
    { value: "PANTS", label: "팬츠" },
    { value: "SHORTS", label: "반바지" },
    { value: "SKIRT", label: "스커트" },
    { value: "LEGGINGS", label: "레깅스" },
  ],
  OUTER: [
    { value: "JACKET", label: "재킷" },
    { value: "CARDIGAN", label: "가디건" },
    { value: "BLAZER", label: "블레이저" },
    { value: "COAT", label: "코트" },
    { value: "PADDING", label: "패딩" },
    { value: "VEST", label: "베스트" },
  ],
  DRESS: [
    { value: "DRESS", label: "원피스" },
    { value: "JUMPSUIT", label: "점프수트" },
  ],
  SHOES: [
    { value: "SNEAKERS", label: "스니커즈" },
    { value: "LOAFERS", label: "로퍼" },
    { value: "BOOTS", label: "부츠" },
    { value: "SANDALS", label: "샌들" },
    { value: "HEELS", label: "힐" },
    { value: "FLATS", label: "플랫" },
  ],
  BAG: [
    { value: "BACKPACK", label: "백팩" },
    { value: "TOTE", label: "토트백" },
    { value: "SHOULDER", label: "숄더백" },
    { value: "CROSSBODY", label: "크로스백" },
  ],
  ACCESSORY: [
    { value: "HAT", label: "모자" },
    { value: "BELT", label: "벨트" },
    { value: "SCARF", label: "스카프" },
    { value: "JEWELRY", label: "주얼리" },
    { value: "ETC", label: "기타" },
  ],
};

const colorOptions = [
  { value: "BLACK", label: "블랙", swatch: "#202124", aliases: ["검정", "검정색"] },
  { value: "WHITE", label: "화이트", swatch: "#ffffff", aliases: ["흰색", "하얀색"] },
  { value: "GRAY", label: "그레이", swatch: "#9ba0a5", aliases: ["회색"] },
  { value: "NAVY", label: "네이비", swatch: "#1f3558", aliases: ["남색"] },
  { value: "BLUE", label: "블루", swatch: "#4e83c5", aliases: ["파랑", "파란색"] },
  { value: "RED", label: "레드", swatch: "#c64b48", aliases: ["빨강", "빨간색"] },
  { value: "GREEN", label: "그린", swatch: "#4f8258", aliases: ["초록", "초록색"] },
  { value: "BROWN", label: "브라운", swatch: "#75513d", aliases: ["갈색"] },
  { value: "BEIGE", label: "베이지", swatch: "#d7c3a5", aliases: [] },
  { value: "YELLOW", label: "옐로", swatch: "#e8c63e", aliases: ["노랑", "노란색"] },
  { value: "ORANGE", label: "오렌지", swatch: "#db7b36", aliases: ["주황", "주황색"] },
  { value: "PINK", label: "핑크", swatch: "#dd8da7", aliases: ["분홍", "분홍색"] },
  { value: "PURPLE", label: "퍼플", swatch: "#8967a6", aliases: ["보라", "보라색"] },
  { value: "ETC", label: "기타", swatch: "#d7d5d2", aliases: [] },
];

const seasonOptions = [
  { value: "SPRING", label: "봄", aliases: [] },
  { value: "SUMMER", label: "여름", aliases: [] },
  { value: "FALL", label: "가을", aliases: ["AUTUMN"] },
  { value: "WINTER", label: "겨울", aliases: [] },
];

const styleTagOptions = [
  { value: "CASUAL", label: "캐주얼" },
  { value: "MINIMAL", label: "미니멀" },
  { value: "STREET", label: "스트리트" },
  { value: "FORMAL", label: "포멀" },
  { value: "SPORTY", label: "스포티" },
];

const patternOptions = [
  { value: "", label: "선택 안 함" },
  { value: "SOLID", label: "무지" },
  { value: "STRIPE", label: "스트라이프" },
  { value: "CHECK", label: "체크" },
  { value: "GRAPHIC", label: "그래픽" },
  { value: "FLORAL", label: "플라워" },
  { value: "OTHER", label: "기타" },
];

const warmthLabels = {
  1: "얇음",
  2: "가벼움",
  3: "보통",
  4: "따뜻함",
  5: "매우 따뜻함",
};

const filterGroups = [
  { id: "season", label: "계절", options: seasonOptions },
  { id: "color", label: "색상", options: colorOptions },
];

const emptyClothes = {
  imageUrl: "",
  alias: "",
  category: "",
  subcategory: "",
  colors: [],
  pattern: "",
  seasons: [],
  styleTags: [],
  warmthLevel: null,
  memo: "",
};

const emptyAnalysisMetadata = {
  model: "",
  processingMs: null,
  requiresReview: false,
  uncertainFields: [],
};

const emptyFormErrors = {
  image: "",
  category: "",
  subcategory: "",
  colors: "",
  form: "",
};

const emptyFilters = { season: [], color: [] };
const defaultExpandedFilters = { season: true, color: true };

function normalizeValues(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [String(value)];
}

function findOptionLabel(options, value) {
  if (!value) return "";
  return options.find((option) => option.value === value)?.label || value;
}

function findSubcategoryLabel(value) {
  return findOptionLabel(Object.values(subcategoryOptions).flat(), value);
}

function formatValues(values, options) {
  const normalizedValues = normalizeValues(values);
  return normalizedValues.map((value) => findOptionLabel(options, value)).join(", ");
}

function formatWarmthLevel(value) {
  return value ? `${value}단계 · ${warmthLabels[value]}` : "미입력";
}

function createGeneratedName(colors, subcategory) {
  const color = findOptionLabel(colorOptions, normalizeValues(colors)[0]);
  const subcategoryLabel = findSubcategoryLabel(subcategory);
  return [color, subcategoryLabel].filter(Boolean).join(" ") || "이름 없는 옷";
}

function createClothesFormValues(source = {}) {
  const warmthLevel = Number(source.warmthLevel);
  const generatedName = createGeneratedName(
    source.colors || source.color,
    source.subcategory || source.subCategory
  );
  const alias =
    typeof source.alias === "string"
      ? source.alias
      : source.name && source.name !== generatedName
        ? source.name
        : "";

  return {
    ...emptyClothes,
    ...source,
    imageUrl: source.imageUrl || source.image || source.thumbnailUrl || "",
    alias,
    category: source.category || source.type || "",
    subcategory: source.subcategory || source.subCategory || "",
    colors: normalizeValues(source.colors || source.color),
    pattern: source.pattern || "",
    seasons: normalizeValues(source.seasons || source.season),
    styleTags: normalizeValues(source.styleTags || source.style || source.styles),
    warmthLevel: Number.isInteger(warmthLevel) && warmthLevel >= 1 && warmthLevel <= 5 ? warmthLevel : null,
    memo: source.memo || source.details || source.description || "",
  };
}

function createSavedClothes(source) {
  const values = createClothesFormValues(source);
  const colors = normalizeValues(values.colors);
  const seasons = normalizeValues(values.seasons);
  const styleTags = normalizeValues(values.styleTags);
  const alias = values.alias.trim();

  return {
    ...source,
    ...values,
    alias,
    name: alias || createGeneratedName(colors, values.subcategory),
    colors,
    color: colors[0] || "",
    seasons,
    season: seasons,
    styleTags,
    style: styleTags,
    memo: values.memo.trim(),
  };
}

function mergeAnalysisIntoDraft(current, result) {
  const draft = createClothesFormValues(current);
  const analysis = createClothesFormValues(result);
  const category = draft.category || analysis.category;
  const canUseAnalyzedSubcategory = category === analysis.category;

  return {
    ...draft,
    imageUrl: draft.imageUrl || analysis.imageUrl,
    category,
    subcategory: draft.subcategory || (canUseAnalyzedSubcategory ? analysis.subcategory : ""),
    colors: draft.colors.length > 0 ? draft.colors : analysis.colors,
    pattern: draft.pattern || analysis.pattern,
    seasons: draft.seasons.length > 0 ? draft.seasons : analysis.seasons,
    styleTags: draft.styleTags.length > 0 ? draft.styleTags : analysis.styleTags,
    warmthLevel: draft.warmthLevel || analysis.warmthLevel,
    memo: draft.memo,
  };
}

function createDisplayClothes(source) {
  const values = createClothesFormValues(source);
  const generatedName = createGeneratedName(values.colors, values.subcategory);

  return {
    ...source,
    ...values,
    name: values.alias || source.name || generatedName,
    color: values.colors[0] || "",
    season: values.seasons,
    style: values.styleTags,
  };
}

function normalizeFieldKey(value) {
  return String(value || "")
    .replace(/[-_\s]/g, "")
    .toLowerCase();
}

function needsFieldReview(uncertainFields, field) {
  const aliases = {
    category: ["category"],
    subcategory: ["subcategory", "subCategory"],
    colors: ["colors", "color"],
    pattern: ["pattern"],
    seasons: ["seasons", "season"],
    styleTags: ["styleTags", "style", "styles"],
    warmthLevel: ["warmthLevel", "warmth"],
    memo: ["memo"],
  };
  const candidates = new Set((aliases[field] || [field]).map(normalizeFieldKey));

  return normalizeValues(uncertainFields).some((value) => candidates.has(normalizeFieldKey(value)));
}

function FieldReviewHint({ field, uncertainFields }) {
  if (!needsFieldReview(uncertainFields, field)) return null;
  return <small className="garment-field-review">확인이 필요해요</small>;
}

function getValidationErrors(values) {
  return {
    image: values.imageUrl ? "" : "사진을 선택해 주세요.",
    category: values.category ? "" : "카테고리를 선택해 주세요.",
    subcategory: values.subcategory ? "" : "세부 카테고리를 선택해 주세요.",
    colors: normalizeValues(values.colors).length > 0 ? "" : "색상을 하나 이상 선택해 주세요.",
    form: "",
  };
}

function hasValidationError(errors) {
  return Boolean(errors.image || errors.category || errors.subcategory || errors.colors);
}

function matchesOption(itemValues, option) {
  const candidates = [option.value, option.label, ...(option.aliases || [])].map((value) =>
    String(value).toLowerCase()
  );

  return normalizeValues(itemValues).some((value) => candidates.includes(value.toLowerCase()));
}

function matchesFilterGroup(item, groupId, values) {
  if (values.length === 0) return true;
  const itemValues = groupId === "season" ? item.seasons || item.season : item.colors || item.color;
  const options = groupId === "season" ? seasonOptions : colorOptions;

  return values.some((value) => {
    const option = options.find((itemOption) => itemOption.value === value);
    return option ? matchesOption(itemValues, option) : false;
  });
}

function matchesCategoryTab(item, selectedCategory) {
  if (selectedCategory === "ALL") return true;
  const categoryOption = categoryOptions.find((option) => option.value === selectedCategory);
  const itemCategory = String(item.category || "").toLowerCase();

  return (
    itemCategory === selectedCategory.toLowerCase() ||
    itemCategory === String(categoryOption?.label || "").toLowerCase()
  );
}

function getAppliedFilterItems(filters) {
  return filterGroups.flatMap((group) =>
    filters[group.id].map((value) => ({
      id: group.id,
      value,
      label: findOptionLabel(group.options, value),
    }))
  );
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.2 16.2 4.3 4.3" />
    </svg>
  );
}

function ClothesGrid({ items, onSelect }) {
  return (
    <div className="clothes-grid">
      {items.map((item) => (
        <article
          className="clothes-card"
          key={item.id}
          tabIndex={0}
          title={item.memo}
          role="button"
          onClick={() => onSelect(item)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(item);
            }
          }}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} />
          ) : (
            <div className="clothes-image-placeholder" aria-hidden="true">
              MY CLOSET
            </div>
          )}
          <h2>{item.name}</h2>
        </article>
      ))}
    </div>
  );
}

function CheckboxChipGroup({
  label,
  values,
  onToggle,
  options,
  colorChips = false,
  error,
  reviewField,
  uncertainFields,
}) {
  const selectedValues = normalizeValues(values);

  return (
    <fieldset className="garment-option-field" aria-invalid={Boolean(error)}>
      <legend>{label}</legend>
      {reviewField && <FieldReviewHint field={reviewField} uncertainFields={uncertainFields} />}
      <div className={`garment-chip-list ${colorChips ? "garment-color-chip-list" : ""}`.trim()}>
        {options.map((option) => (
          <label className="garment-chip" key={option.value}>
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={() => onToggle(option.value)}
            />
            <span>
              {colorChips && (
                <i
                  className="garment-color-swatch"
                  style={{ "--swatch-color": option.swatch }}
                  aria-hidden="true"
                />
              )}
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
    </fieldset>
  );
}

function GarmentInfoForm({
  values,
  onFieldChange,
  onToggleArrayValue,
  onImageChange,
  onSubmit,
  formRef,
  errors,
  onCancel,
  submitLabel,
  submitDisabled,
  showImagePicker = false,
  analysisMetadata = emptyAnalysisMetadata,
}) {
  const availableSubcategories = subcategoryOptions[values.category] || [];
  const warmthLevel = values.warmthLevel || 3;
  const imageInputRef = React.useRef(null);

  return (
    <form ref={formRef} className="garment-info-form" onSubmit={onSubmit}>
      {analysisMetadata.requiresReview && (
        <p className="garment-analysis-review" role="status">
          AI 분석 결과를 확인하고 수정해 주세요.
        </p>
      )}
      {showImagePicker && (
        <div className="garment-edit-image-picker">
          <span>사진 변경</span>
          <input
            ref={imageInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={onImageChange}
          />
          <div className="garment-edit-image-actions">
            <button type="button" className="modal-button" onClick={() => imageInputRef.current?.click()}>
              사진 추가
            </button>
          </div>
          {values.imageUrl && <img src={values.imageUrl} alt="수정 중인 옷 미리보기" />}
        </div>
      )}
      <label className="garment-select-field">
        <span>
          카테고리 <b aria-hidden="true">필수</b>
        </span>
        <select
          value={values.category}
          required
          data-autofocus
          onChange={(event) => onFieldChange("category", event.target.value)}
        >
          <option value="">카테고리 선택</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldReviewHint field="category" uncertainFields={analysisMetadata.uncertainFields} />
        {errors.category && <p className="form-error">{errors.category}</p>}
      </label>
      <label className="garment-select-field">
        <span>
          세부 카테고리 <b aria-hidden="true">필수</b>
        </span>
        <select
          value={values.subcategory}
          required
          disabled={!values.category}
          onChange={(event) => onFieldChange("subcategory", event.target.value)}
        >
          <option value="">세부 카테고리 선택</option>
          {availableSubcategories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldReviewHint field="subcategory" uncertainFields={analysisMetadata.uncertainFields} />
        {errors.subcategory && <p className="form-error">{errors.subcategory}</p>}
      </label>
      <label className="garment-select-field">
        <span>옷 별칭 (이름)</span>
        <input
          type="text"
          value={values.alias}
          maxLength="50"
          placeholder="예: 출근용 네이비 맨투맨"
          onChange={(event) => onFieldChange("alias", event.target.value)}
        />
      </label>
      <CheckboxChipGroup
        label="색상"
        values={values.colors}
        onToggle={(value) => onToggleArrayValue("colors", value)}
        options={colorOptions}
        colorChips
        error={errors.colors}
        reviewField="colors"
        uncertainFields={analysisMetadata.uncertainFields}
      />
      <label className="garment-select-field">
        <span>패턴</span>
        <select value={values.pattern} onChange={(event) => onFieldChange("pattern", event.target.value)}>
          {patternOptions.map((option) => (
            <option key={option.value || "none"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldReviewHint field="pattern" uncertainFields={analysisMetadata.uncertainFields} />
      </label>
      <CheckboxChipGroup
        label="계절"
        values={values.seasons}
        onToggle={(value) => onToggleArrayValue("seasons", value)}
        options={seasonOptions}
        reviewField="seasons"
        uncertainFields={analysisMetadata.uncertainFields}
      />
      <CheckboxChipGroup
        label="스타일"
        values={values.styleTags}
        onToggle={(value) => onToggleArrayValue("styleTags", value)}
        options={styleTagOptions}
        reviewField="styleTags"
        uncertainFields={analysisMetadata.uncertainFields}
      />
      <fieldset className="garment-warmth-field">
        <legend>보온감</legend>
        <div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={warmthLevel}
            aria-valuetext={`${warmthLevel}단계, ${warmthLabels[warmthLevel]}`}
            onChange={(event) => onFieldChange("warmthLevel", Number(event.target.value))}
          />
          <output>
            {warmthLevel}단계 · {warmthLabels[warmthLevel]}
          </output>
        </div>
        <FieldReviewHint field="warmthLevel" uncertainFields={analysisMetadata.uncertainFields} />
        <small>1: 얇음 · 3: 보통 · 5: 매우 따뜻함</small>
      </fieldset>
      <label className="garment-select-field">
        <span>메모</span>
        <textarea
          value={values.memo}
          placeholder="기억해 둘 내용을 적어 주세요."
          onChange={(event) => onFieldChange("memo", event.target.value)}
        />
        <FieldReviewHint field="memo" uncertainFields={analysisMetadata.uncertainFields} />
      </label>
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="modal-actions garment-form-actions">
        <button type="button" className="modal-cancel-button" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="modal-button" disabled={submitDisabled}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function DetailRow({ label, children }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function ClosetPage({ user, onLogin }) {
  const [clothes, setClothes] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("ALL");
  const [status, setStatus] = React.useState(user ? "loading" : "idle");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = React.useState(emptyFilters);
  const [expandedFilters, setExpandedFilters] = React.useState(defaultExpandedFilters);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [addStep, setAddStep] = React.useState("image");
  const [newClothes, setNewClothes] = React.useState(emptyClothes);
  const [addErrors, setAddErrors] = React.useState(emptyFormErrors);
  const [analysisStatus, setAnalysisStatus] = React.useState("uploaded");
  const [analysisError, setAnalysisError] = React.useState("");
  const [analysisMetadata, setAnalysisMetadata] = React.useState(emptyAnalysisMetadata);
  const [selectedImageFile, setSelectedImageFile] = React.useState(null);
  const [isClothesSaving, setIsClothesSaving] = React.useState(false);
  const [selectedClothes, setSelectedClothes] = React.useState(null);
  const [isEditingClothes, setIsEditingClothes] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [isClothesDeleting, setIsClothesDeleting] = React.useState(false);
  const [detailError, setDetailError] = React.useState("");
  const [saveNotice, setSaveNotice] = React.useState("");
  const [editClothes, setEditClothes] = React.useState(emptyClothes);
  const [editImageFile, setEditImageFile] = React.useState(null);
  const [editErrors, setEditErrors] = React.useState(emptyFormErrors);
  const addImageInputRef = React.useRef(null);
  const addFormRef = React.useRef(null);
  const editFormRef = React.useRef(null);
  const analysisControllerRef = React.useRef(null);
  const analysisTimersRef = React.useRef([]);
  const saveNoticeTimerRef = React.useRef(null);

  const cancelAnalysis = React.useCallback(() => {
    analysisControllerRef.current?.abort();
    analysisControllerRef.current = null;
    analysisTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    analysisTimersRef.current = [];
  }, []);

  React.useEffect(() => cancelAnalysis, [cancelAnalysis]);

  React.useEffect(
    () => () => {
      window.clearTimeout(saveNoticeTimerRef.current);
    },
    []
  );

  React.useEffect(() => {
    if (!user) {
      setClothes([]);
      setStatus("idle");
      return undefined;
    }

    let isActive = true;
    setStatus("loading");

    fetchMyClothes(user)
      .then((items) => {
        if (!isActive) return;
        setClothes(items.map(createDisplayClothes));
        setStatus("ready");
      })
      .catch((error) => {
        if (isActive) setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [user]);

  React.useEffect(() => {
    if (!isFilterOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsFilterOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isFilterOpen]);

  const visibleClothes = clothes.filter((item) => {
    const matchesQuery = String(item.name || "")
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesQuery && matchesCategoryTab(item, category);
  });
  const filteredClothes = visibleClothes.filter(
    (item) =>
      matchesFilterGroup(item, "season", appliedFilters.season) &&
      matchesFilterGroup(item, "color", appliedFilters.color)
  );
  const appliedFilterItems = getAppliedFilterItems(appliedFilters);
  const hasAppliedFilters = appliedFilterItems.length > 0;
  const addCanSave = !hasValidationError(getValidationErrors(newClothes));
  const editCanSave = !hasValidationError(getValidationErrors(editClothes));

  function showSaveNotice(message, delay = 0) {
    window.clearTimeout(saveNoticeTimerRef.current);
    const show = () => {
      setSaveNotice(message);
      saveNoticeTimerRef.current = window.setTimeout(() => setSaveNotice(""), 3000);
    };

    if (delay) {
      saveNoticeTimerRef.current = window.setTimeout(show, delay);
      return;
    }

    show();
  }

  function resetAddDraft() {
    setAddStep("image");
    setNewClothes(emptyClothes);
    setAddErrors(emptyFormErrors);
    setAnalysisStatus("uploaded");
    setAnalysisError("");
    setAnalysisMetadata(emptyAnalysisMetadata);
    setSelectedImageFile(null);
    if (addImageInputRef.current) addImageInputRef.current.value = "";
  }

  function openAddModal() {
    resetAddDraft();
    setIsAddModalOpen(true);
  }

  function closeAddModal() {
    cancelAnalysis();
    setIsAddModalOpen(false);
    resetAddDraft();
  }

  async function handleAddImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAddErrors({ ...emptyFormErrors, form: "이미지 파일만 선택할 수 있습니다." });
      return;
    }

    try {
      const imageUrl = await readImageFile(file);
      setSelectedImageFile(file);
      setNewClothes({ ...emptyClothes, imageUrl });
      setAddErrors(emptyFormErrors);
      setAnalysisError("");
      setAnalysisMetadata(emptyAnalysisMetadata);
      startAnalysis(file, imageUrl);
    } catch {
      setAddErrors({ ...emptyFormErrors, form: "이미지를 읽지 못했습니다. 다시 선택해 주세요." });
    }
  }

  async function startAnalysis(file = selectedImageFile, imageUrl = newClothes.imageUrl) {
    if (!imageUrl) {
      setAddErrors({ ...emptyFormErrors, image: "사진을 선택해 주세요." });
      return;
    }

    cancelAnalysis();
    const controller = new AbortController();
    analysisControllerRef.current = controller;
    setAddStep("analyzing");
    setAnalysisStatus("uploaded");
    setAnalysisError("");
    analysisTimersRef.current = [
      window.setTimeout(() => setAnalysisStatus("features"), 300),
      window.setTimeout(() => setAnalysisStatus("organizing"), 800),
    ];

    try {
      const result = await analyzeGarmentImage(file || imageUrl, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      setNewClothes((current) => mergeAnalysisIntoDraft(current, result.draft));
      setAnalysisMetadata(result.metadata);
      setAddErrors(emptyFormErrors);
      setAddStep("form");
    } catch (error) {
      if (error.name === "AbortError") return;
      setAnalysisError(error.message || "분석을 완료하지 못했습니다. 다시 시도해 주세요.");
      setAddStep("error");
    } finally {
      analysisTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      analysisTimersRef.current = [];
      if (analysisControllerRef.current === controller) analysisControllerRef.current = null;
    }
  }

  function startDirectInput() {
    cancelAnalysis();
    setNewClothes((current) => ({ ...emptyClothes, imageUrl: current.imageUrl }));
    setAddErrors(emptyFormErrors);
    setAnalysisMetadata(emptyAnalysisMetadata);
    setAddStep("form");
  }

  function updateNewClothesField(field, value) {
    setNewClothes((current) => {
      const next = { ...current, [field]: value };
      if (field === "category") next.subcategory = "";
      return next;
    });
    setAddErrors((current) => ({
      ...current,
      [field]: "",
      ...(field === "category" ? { subcategory: "" } : {}),
      form: "",
    }));
  }

  function toggleNewClothesArrayField(field, value) {
    setNewClothes((current) => {
      const values = normalizeValues(current[field]);
      return {
        ...current,
        [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
    if (field === "colors") setAddErrors((current) => ({ ...current, colors: "", form: "" }));
  }

  async function handleAddClothes(event) {
    event.preventDefault();
    const errors = getValidationErrors(newClothes);
    if (hasValidationError(errors)) {
      setAddErrors(errors);
      return;
    }

    setIsClothesSaving(true);
    try {
      const imageUrl = selectedImageFile ? await uploadClothesImage(selectedImageFile) : newClothes.imageUrl;
      const item = createDisplayClothes(await createClothes(createSavedClothes({ ...newClothes, imageUrl })));
      setClothes((current) => [...current, item]);
      setStatus("ready");
      closeAddModal();
      showSaveNotice("옷장에 저장했어요.", 180);
    } catch (error) {
      setAddErrors({
        ...emptyFormErrors,
        form: error.message || "옷을 저장하지 못했습니다. 다시 시도해 주세요.",
      });
    } finally {
      setIsClothesSaving(false);
    }
  }

  function openDetailModal(item) {
    setSelectedClothes(item);
    setIsEditingClothes(false);
    setEditImageFile(null);
    setEditClothes(createClothesFormValues(item));
    setEditErrors(emptyFormErrors);
    setDetailError("");
  }

  function closeDetailModal() {
    setSelectedClothes(null);
    setIsEditingClothes(false);
    setIsDeleteConfirmOpen(false);
    setEditClothes(emptyClothes);
    setEditImageFile(null);
    setEditErrors(emptyFormErrors);
    setDetailError("");
  }

  function startEditingClothes() {
    if (!selectedClothes) return;
    setEditClothes(createClothesFormValues(selectedClothes));
    setEditImageFile(null);
    setEditErrors(emptyFormErrors);
    setDetailError("");
    setIsEditingClothes(true);
  }

  function cancelEditingClothes() {
    setEditClothes(createClothesFormValues(selectedClothes));
    setEditImageFile(null);
    setEditErrors(emptyFormErrors);
    setIsEditingClothes(false);
  }

  function updateEditClothesField(field, value) {
    setEditClothes((current) => {
      const next = { ...current, [field]: value };
      if (field === "category") next.subcategory = "";
      return next;
    });
    setEditErrors((current) => ({
      ...current,
      [field]: "",
      ...(field === "category" ? { subcategory: "" } : {}),
      form: "",
    }));
  }

  function toggleEditClothesArrayField(field, value) {
    setEditClothes((current) => {
      const values = normalizeValues(current[field]);
      return {
        ...current,
        [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
    if (field === "colors") setEditErrors((current) => ({ ...current, colors: "", form: "" }));
  }

  async function handleEditImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEditErrors({ ...emptyFormErrors, form: "이미지 파일만 선택할 수 있습니다." });
      return;
    }

    try {
      const imageUrl = await readImageFile(file);
      setEditImageFile(file);
      setEditClothes((current) => ({ ...current, imageUrl }));
      setEditErrors((current) => ({ ...current, image: "", form: "" }));
    } catch {
      setEditErrors({ ...emptyFormErrors, form: "이미지를 읽지 못했습니다. 다시 선택해 주세요." });
    }
  }

  async function handleUpdateClothes(event) {
    event.preventDefault();
    if (!selectedClothes) return;

    const errors = getValidationErrors(editClothes);
    if (hasValidationError(errors)) {
      setEditErrors(errors);
      return;
    }

    setIsClothesSaving(true);
    try {
      const imageUrl = editImageFile ? await uploadClothesImage(editImageFile) : editClothes.imageUrl;
      const updatedItem = createDisplayClothes(
        await updateClothes(
          selectedClothes.id,
          createSavedClothes({ ...selectedClothes, ...editClothes, imageUrl })
        )
      );

      setClothes((current) =>
        current.map((item) => (String(item.id) === String(selectedClothes.id) ? updatedItem : item))
      );
      setSelectedClothes(updatedItem);
      setEditClothes(createClothesFormValues(updatedItem));
      setEditImageFile(null);
      setEditErrors(emptyFormErrors);
      setIsEditingClothes(false);
      showSaveNotice("수정한 옷 정보를 저장했어요.");
    } catch (error) {
      setEditErrors({
        ...emptyFormErrors,
        form: error.message || "옷 정보를 수정하지 못했습니다. 다시 시도해 주세요.",
      });
    } finally {
      setIsClothesSaving(false);
    }
  }

  function toggleDraftFilter(groupId, value) {
    setDraftFilters((current) => {
      const values = current[groupId];
      return {
        ...current,
        [groupId]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
  }

  function openFilterSidebar() {
    setDraftFilters({ season: [...appliedFilters.season], color: [...appliedFilters.color] });
    setIsFilterOpen(true);
  }

  function resetDraftFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  async function confirmDeleteClothes() {
    if (!selectedClothes || isClothesDeleting) return;

    setIsClothesDeleting(true);
    try {
      await deleteClothes(selectedClothes.id);
      setClothes((current) => current.filter((item) => String(item.id) !== String(selectedClothes.id)));
      closeDetailModal();
    } catch (error) {
      setIsDeleteConfirmOpen(false);
      setDetailError(error.message || "옷을 삭제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsClothesDeleting(false);
    }
  }

  function renderAddModalContent() {
    if (addStep === "image") {
      return (
        <div className={`garment-image-step ${newClothes.imageUrl ? "has-image" : "is-empty"}`}>
          <p>사진을 선택하면 옷의 기본 정보를 분석해 드립니다.</p>
          <input
            ref={addImageInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={handleAddImageChange}
          />
          {newClothes.imageUrl ? (
            <img className="garment-upload-preview" src={newClothes.imageUrl} alt="선택한 옷 사진" />
          ) : (
            <div className="garment-upload-placeholder" aria-hidden="true">
              사진 미리보기
            </div>
          )}
          {addErrors.image && <p className="form-error">{addErrors.image}</p>}
          {addErrors.form && <p className="form-error">{addErrors.form}</p>}
          <div className="garment-image-actions">
            <button
              type="button"
              className="modal-button"
              data-autofocus
              onClick={() => addImageInputRef.current?.click()}
            >
              사진 추가
            </button>
          </div>
          <button type="button" className="garment-text-button" onClick={closeAddModal}>
            취소
          </button>
        </div>
      );
    }

    if (addStep === "analyzing") {
      const messages = {
        uploaded: "사진 업로드 완료",
        features: "옷 특징 분석 중...",
        organizing: "정보 정리 중...",
      };
      const activeIndex = ["uploaded", "features", "organizing"].indexOf(analysisStatus);

      return (
        <div className="garment-analysis-step" role="status" aria-live="polite">
          <img className="garment-analysis-thumbnail" src={newClothes.imageUrl} alt="분석 중인 옷 사진" />
          <span className="garment-spinner" aria-hidden="true" />
          <p>AI가 옷 정보를 분석하고 있어요</p>
          <ol className="garment-analysis-status-list">
            {Object.entries(messages).map(([key, message], index) => (
              <li key={key} className={index <= activeIndex ? "is-active" : ""}>
                {message}
              </li>
            ))}
          </ol>
          <button type="button" className="modal-cancel-button" onClick={closeAddModal}>
            취소
          </button>
        </div>
      );
    }

    if (addStep === "error") {
      return (
        <div className="garment-analysis-error" role="alert">
          {newClothes.imageUrl && (
            <img
              className="garment-analysis-thumbnail"
              src={newClothes.imageUrl}
              alt="분석에 실패한 옷 사진"
            />
          )}
          <p>{analysisError}</p>
          <div className="garment-image-actions">
            <button type="button" className="modal-cancel-button" onClick={() => startAnalysis()}>
              다시 시도
            </button>
            <input
              ref={addImageInputRef}
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={handleAddImageChange}
            />
            <button type="button" className="modal-button" onClick={() => addImageInputRef.current?.click()}>
              사진 추가
            </button>
            <button type="button" className="modal-button" onClick={startDirectInput}>
              직접 입력하기
            </button>
          </div>
          <button type="button" className="garment-text-button" onClick={closeAddModal}>
            취소
          </button>
        </div>
      );
    }

    return (
      <GarmentInfoForm
        values={newClothes}
        onFieldChange={updateNewClothesField}
        onToggleArrayValue={toggleNewClothesArrayField}
        onSubmit={handleAddClothes}
        formRef={addFormRef}
        errors={addErrors}
        onCancel={closeAddModal}
        submitLabel="저장하기"
        submitDisabled={!addCanSave || isClothesSaving}
        analysisMetadata={analysisMetadata}
      />
    );
  }

  if (!user) return null;

  return (
    <main className="closet-main">
      {saveNotice && (
        <p className="closet-save-notice" role="status" aria-live="polite">
          {saveNotice}
        </p>
      )}
      <h1>{user ? `${user.nickname || user.id}의 옷장` : "나의 옷장"}</h1>
      <div className="closet-tools">
        <div className="closet-search">
          <input
            type="search"
            value={query}
            placeholder="이름으로 옷 검색"
            aria-label="이름으로 옷 검색"
            onChange={(event) => setQuery(event.target.value)}
          />
          <SearchIcon />
        </div>
        <button
          type="button"
          className="closet-filter-button"
          aria-label="필터 열기"
          aria-expanded={isFilterOpen}
          aria-controls="closet-filter-sidebar"
          onClick={openFilterSidebar}
        >
          <img src={filterButtonImage} alt="" />
        </button>
      </div>
      <div className="closet-categories" role="group" aria-label="옷 카테고리">
        {categoryTabs.map((item) => (
          <button
            type="button"
            key={item.value}
            className={category === item.value ? "is-active" : ""}
            aria-pressed={category === item.value}
            onClick={() => setCategory(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {hasAppliedFilters && (
        <div className="applied-filter-tags" aria-label="적용된 필터">
          {appliedFilterItems.map((filter) => (
            <span className="applied-filter-tag" key={`${filter.id}-${filter.value}`}>
              {filter.label}
            </span>
          ))}
        </div>
      )}
      <section className="closet-content" aria-live="polite">
        {!user && (
          <div className="closet-empty">
            <p>로그인하고 나만의 옷장을 확인해 보세요.</p>
            <button type="button" className="closet-login-button" onClick={onLogin}>
              로그인하기
            </button>
          </div>
        )}
        {user && status === "loading" && <p className="closet-message">옷장을 불러오는 중입니다.</p>}
        {user && status === "error" && <p className="closet-message">옷 목록을 불러오지 못했습니다.</p>}
        {user && status === "ready" && clothes.length === 0 && (
          <p className="closet-message">옷장에 등록된 옷이 없습니다.</p>
        )}
        {user && status === "ready" && clothes.length > 0 && visibleClothes.length === 0 && (
          <p className="closet-message">검색 결과가 없습니다.</p>
        )}
        {user && visibleClothes.length > 0 && hasAppliedFilters && filteredClothes.length === 0 && (
          <p className="filter-empty-message">조건에 맞는 옷이 없습니다.</p>
        )}
        {user && visibleClothes.length > 0 && (!hasAppliedFilters || filteredClothes.length > 0) && (
          <ClothesGrid
            items={hasAppliedFilters ? filteredClothes : visibleClothes}
            onSelect={openDetailModal}
          />
        )}
      </section>
      <div
        className={`closet-filter-backdrop ${isFilterOpen ? "is-open" : ""}`}
        role="presentation"
        onMouseDown={(event) => event.target === event.currentTarget && setIsFilterOpen(false)}
      >
        <aside className="closet-filter-sidebar" id="closet-filter-sidebar" aria-hidden={!isFilterOpen}>
          <div className="filter-sidebar-head">
            <h2>필터</h2>
            <button
              type="button"
              className="filter-sidebar-close"
              aria-label="필터 닫기"
              onClick={() => setIsFilterOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="filter-sidebar-body">
            {filterGroups.map((group) => (
              <section className="filter-group" key={group.id}>
                <button
                  type="button"
                  className="filter-group-toggle"
                  aria-expanded={expandedFilters[group.id]}
                  onClick={() =>
                    setExpandedFilters((current) => ({
                      ...current,
                      [group.id]: !current[group.id],
                    }))
                  }
                >
                  {group.label}
                  <span aria-hidden="true" />
                </button>
                {expandedFilters[group.id] && (
                  <div className="filter-options">
                    {group.options.map((option) => (
                      <label className="filter-checkbox" key={option.value}>
                        <input
                          type="checkbox"
                          checked={draftFilters[group.id].includes(option.value)}
                          onChange={() => toggleDraftFilter(group.id, option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
          <div className="filter-sidebar-actions">
            <button type="button" className="filter-reset-button" onClick={resetDraftFilters}>
              초기화
            </button>
            <button
              type="button"
              className="filter-apply-button"
              onClick={() => {
                setAppliedFilters(draftFilters);
                setIsFilterOpen(false);
              }}
            >
              적용하기
            </button>
          </div>
        </aside>
      </div>
      <button
        type="button"
        className="closet-add-button"
        aria-label={user ? "옷 추가하기" : "로그인하고 옷 추가하기"}
        onClick={user ? openAddModal : onLogin}
      >
        <img src={addButtonImage} alt="" />
      </button>
      <ScrollTopButton className="closet-top-button" />
      <Modal
        isOpen={isAddModalOpen}
        titleId="add-clothes-title"
        onClose={closeAddModal}
        onConfirm={() => {
          if (addStep === "form") addFormRef.current?.requestSubmit();
        }}
        className={`add-clothes-modal garment-add-modal ${
          addStep === "image" && !newClothes.imageUrl ? "is-image-empty" : ""
        }`}
      >
        <p className="garment-step-label">
          {addStep === "image" && "1 / 3 이미지 추가"}
          {addStep === "analyzing" && "2 / 3 AI 추론 중"}
          {addStep === "error" && "2 / 3 분석을 완료하지 못했어요"}
          {addStep === "form" && "3 / 3 옷 정보 확인"}
        </p>
        <h2 id="add-clothes-title">
          {addStep === "image" && "옷 사진을 추가해 주세요"}
          {addStep === "analyzing" && "옷 정보를 분석하고 있어요"}
          {addStep === "error" && "분석에 실패했어요"}
          {addStep === "form" && "옷 정보 확인 및 수정"}
        </h2>
        {renderAddModalContent()}
      </Modal>
      <Modal
        isOpen={Boolean(selectedClothes)}
        titleId="clothes-detail-title"
        onClose={closeDetailModal}
        onConfirm={() => {
          if (isEditingClothes) editFormRef.current?.requestSubmit();
        }}
        className="clothes-detail-modal"
      >
        {selectedClothes && !isEditingClothes && (
          <>
            <h2 id="clothes-detail-title">{selectedClothes.name}</h2>
            {selectedClothes.imageUrl ? (
              <img
                className="clothes-detail-image"
                src={selectedClothes.imageUrl}
                alt={selectedClothes.name}
              />
            ) : (
              <div className="clothes-detail-placeholder" aria-hidden="true">
                MY CLOSET
              </div>
            )}
            <dl className="clothes-detail-list">
              <DetailRow label="카테고리">
                {findOptionLabel(categoryOptions, selectedClothes.category) || "미분류"}
              </DetailRow>
              <DetailRow label="세부 카테고리">
                {findSubcategoryLabel(selectedClothes.subcategory) || "미분류"}
              </DetailRow>
              <DetailRow label="색상">
                {formatValues(selectedClothes.colors || selectedClothes.color, colorOptions) || "미분류"}
              </DetailRow>
              <DetailRow label="패턴">
                {findOptionLabel(patternOptions, selectedClothes.pattern) || "선택 안 함"}
              </DetailRow>
              <DetailRow label="계절">
                {formatValues(selectedClothes.seasons || selectedClothes.season, seasonOptions) || "미입력"}
              </DetailRow>
              <DetailRow label="스타일">
                {formatValues(selectedClothes.styleTags || selectedClothes.style, styleTagOptions) ||
                  "미입력"}
              </DetailRow>
              <DetailRow label="보온감">{formatWarmthLevel(selectedClothes.warmthLevel)}</DetailRow>
              <DetailRow label="메모">{selectedClothes.memo || "등록한 메모가 없습니다."}</DetailRow>
            </dl>
            <div className="detail-modal-actions">
              {detailError && <p className="form-error">{detailError}</p>}
              <button
                type="button"
                className="detail-delete-button"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                삭제하기
              </button>
              <button type="button" className="modal-button" onClick={startEditingClothes}>
                수정하기
              </button>
              <button type="button" className="modal-cancel-button" onClick={closeDetailModal}>
                닫기
              </button>
            </div>
          </>
        )}
        {selectedClothes && isEditingClothes && (
          <>
            <h2 id="clothes-detail-title">옷 정보 수정</h2>
            <GarmentInfoForm
              values={editClothes}
              onFieldChange={updateEditClothesField}
              onToggleArrayValue={toggleEditClothesArrayField}
              onImageChange={handleEditImageChange}
              onSubmit={handleUpdateClothes}
              formRef={editFormRef}
              errors={editErrors}
              onCancel={cancelEditingClothes}
              submitLabel="저장하기"
              submitDisabled={!editCanSave || isClothesSaving}
              showImagePicker
            />
          </>
        )}
      </Modal>
      <Modal
        isOpen={isDeleteConfirmOpen}
        titleId="delete-clothes-title"
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteClothes}
        className="delete-confirm-modal"
      >
        <h2 id="delete-clothes-title">이 옷을 삭제할까요?</h2>
        <p>삭제한 옷은 되돌릴 수 없습니다.</p>
        <div className="modal-actions">
          <button type="button" className="modal-cancel-button" onClick={() => setIsDeleteConfirmOpen(false)}>
            취소
          </button>
          <button
            type="button"
            className="detail-delete-button"
            onClick={confirmDeleteClothes}
            disabled={isClothesDeleting}
          >
            {isClothesDeleting ? "삭제 중..." : "삭제하기"}
          </button>
        </div>
      </Modal>
    </main>
  );
}

export default ClosetPage;
