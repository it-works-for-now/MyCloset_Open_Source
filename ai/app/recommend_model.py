from __future__ import annotations

import json
import logging
import re
import threading
import time
from typing import Any

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

from .config import Settings
from .schemas import OUTFIT_SLOTS, ClosetItem, ModelGender, OutfitRecommendation, OutfitSlots, Weather

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """당신은 패션 스타일리스트입니다. 제공된 옷장과 상황에 맞춰 서로 다른 코디 2가지를 제안하세요.

반드시 다음을 지키세요.
1. 입력 closet에 실제로 있는 clothesId만 사용하세요.
2. top은 TOP, bottom은 BOTTOM, outer는 OUTER, shoes는 SHOES 카테고리만 사용할 수 있습니다.
3. hat, accessoryTop, accessoryBottom, accessoryShoes는 ACCESSORY 또는 BAG만 사용할 수 있습니다.
4. top과 bottom은 모든 코디에 필수입니다. 선택하지 않는 슬롯은 null입니다.
5. 계절, 상황, 스타일 태그를 고려하고 각 코디의 분위기를 다르게 하세요.
Title requirement: add a short, natural Korean title reflecting the outfit mood, the situation, and selected clothing style; use 2-30 characters, never leave it blank, and avoid mechanical titles such as "recommended look 1" or "outfit 1".
Return exactly two distinct recommendations. Keep every reason to one concise Korean sentence and return exactly two styleKeywords.
6. reason 규칙:
   - 자연스러운 한국어 한 문장으로 작성하세요. 선택된 top과 bottom은 각각 한 번만 언급하고, shoes·outer·bag·accessory는 실제로 선택된 경우에만 한 번 보조적으로 언급하세요.
   - 같은 의류명, 색상+의류명, clothesId, 슬롯을 반복하지 마세요. 선택하지 않은 옷을 만들거나 언급하지 마세요.
   - top·bottom·outer·shoes는 "매치"하거나 "조합"하고, bag·accessory는 "포인트를 더한다"고 표현하세요. 액세서리를 "입는다"고 표현하지 마세요.
   - 단순 나열보다, 조합이 상황에 어울리는 이유를 자연스럽게 설명하세요.
7. styleKeywords에는 이미지 생성에 쓸 영어 소문자 형용사 2~4개만 넣으세요.
8. 사용자 메시지에 [날씨 정보]가 있으면 weather.temp, weather.tempMin, weather.tempMax, weather.condition을 코디 선정과 reason에 반드시 반영하세요.
   - 더운 날에는 통풍이 좋은 얇은 옷을 우선하고 불필요한 outer는 제외하세요. 추운 날에는 warmthLevel이 높은 옷과 outer를 우선하세요.
   - 비·소나기·눈에는 보유한 옷 안에서 젖어도 부담이 적거나 보호가 되는 shoes·outer를 우선하고, 맑거나 햇빛이 강한 날에는 보유한 hat을 고려하세요.
   - weather가 없으면 날씨, 기온, 강수, 계절을 추측하거나 reason에 임의로 언급하지 마세요.
   - 날씨에 맞는 옷이 없더라도 새로운 clothesId를 만들지 말고 입력 closet 안에서 가장 적합한 조합만 선택하세요.
9. [착용 모델 성별]의 modelGender는 결과 착용자의 고정 성별입니다. male이면 성인 남성, female이면 성인 여성으로만 표현하세요.
   - modelGender와 다른 성별을 사용하거나 여러 성별을 혼합하지 마세요. 여러 명의 모델을 만들거나 성별을 추측하지 마세요.
   - 성별만을 이유로 closet의 옷을 제외하지 말고, 없는 옷이나 clothesId를 만들어 내지 마세요.

설명이나 Markdown code fence 없이 아래 JSON 객체만 반환하세요.
{
  "recommendations": [
    {
      "title": "\ubbf8\ub2c8\uba40 \ucea0\ud37c\uc2a4 \ub370\uc77c\ub9ac\ub8e9",
      "slots": {"hat": null, "accessoryTop": null, "top": 101, "outer": null, "bottom": 202, "accessoryBottom": null, "shoes": 303, "accessoryShoes": null},
      "reason": "화이트 셔츠와 블랙 슬랙스에 스니커즈를 매치해 캠퍼스에서 편안하게 활용하기 좋은 깔끔한 코디입니다.",
      "styleKeywords": ["casual", "clean"]
    }
  ]
}"""

ALLOWED_CATEGORY: dict[str, set[str]] = {
    "hat": {"ACCESSORY", "BAG"},
    "accessoryTop": {"ACCESSORY", "BAG"},
    "top": {"TOP"},
    "outer": {"OUTER"},
    "bottom": {"BOTTOM"},
    "accessoryBottom": {"ACCESSORY", "BAG"},
    "shoes": {"SHOES"},
    "accessoryShoes": {"ACCESSORY", "BAG"},
}
KEYWORD_RE = re.compile(r"^[a-z][a-z-]{1,31}$")
MECHANICAL_TITLE_RE = re.compile(r"^(?:(?:\ucd94\ucc9c\s*)?\ub8e9|(?:\ucd94\ucc9c\s*)?\ucf54\ub514)\s*\d+$")


class RecommendationValidationError(ValueError):
    """The model response cannot form a safe, contract-compliant recommendation."""


class RecommendationJSONError(RecommendationValidationError):
    """The model response did not contain a parseable JSON object."""


def _build_user_message(
    situation: str,
    closet: list[ClosetItem],
    model_gender: ModelGender,
    weather: Weather | None = None,
) -> str:
    payload = [
        {
            "clothesId": item.clothesId,
            "category": item.category.value,
            "subcategory": item.subcategory,
            "colors": [color.value for color in item.colors],
            "pattern": item.pattern.value if item.pattern else None,
            "seasons": [season.value for season in item.seasons],
            "styleTags": [tag.value for tag in item.styleTags],
            "warmthLevel": item.warmthLevel,
        }
        for item in closet
    ]
    gender_description = (
        "성인 남성 패션 모델 한 명" if model_gender is ModelGender.MALE else "성인 여성 패션 모델 한 명"
    )
    message = (
        "[상황]\n"
        + situation
        + "\n\n[옷장 정보]\n"
        + json.dumps(payload, ensure_ascii=False)
        + "\n\n[착용 모델 성별]\n"
        + f"modelGender: {model_gender.value}. 결과 착용자는 {gender_description}이어야 합니다. "
        + "다른 성별, 혼합 성별, 여러 명의 모델을 사용하지 마세요. 성별을 이유로 보유 옷을 제외하거나 새 옷을 만들지 마세요."
    )
    if weather is None:
        return message
    return (
        message
        + "\n\n[날씨 정보]\n"
        + json.dumps(weather.model_dump(), ensure_ascii=False)
        + "\n\n[필수 날씨 반영 지침]\n- "
        + "\n- ".join(_build_weather_guidance(weather))
    )


def _format_temperature(value: float) -> str:
    return f"{value:g}°C"


def _weather_condition_label(condition: str | None) -> str | None:
    normalized = (condition or "").strip().lower()
    if not normalized:
        return None
    if "thunder" in normalized:
        return "천둥번개가 있는 날씨"
    if "snow" in normalized:
        return "눈 오는 날씨"
    if any(word in normalized for word in ("rain", "shower", "drizzle")):
        return "비 오는 날씨"
    if "clear" in normalized or "sun" in normalized:
        return "맑은 날씨"
    if "cloud" in normalized or "overcast" in normalized:
        return "구름 낀 날씨"
    return f"{condition.strip()} 상태의 날씨"


def _build_weather_guidance(weather: Weather) -> list[str]:
    guidance = ["weather가 제공되었으므로 모든 코디 선정과 reason에 현재 기온·최저/최고 기온·날씨 상태를 반영한다."]
    if weather.temp is not None:
        if weather.temp >= 25:
            guidance.append("더운 날씨이므로 통풍이 좋은 얇은 옷을 우선하고 불필요한 outer는 피한다.")
        elif weather.temp <= 10:
            guidance.append("추운 날씨이므로 warmthLevel이 높은 옷과 보유한 outer를 우선한다.")
    condition = (weather.condition or "").lower()
    if any(word in condition for word in ("rain", "shower", "drizzle", "snow", "thunder")):
        guidance.append(
            "강수 가능성이 있으므로 보유한 shoes·outer 중 젖어도 부담이 적거나 보호가 되는 아이템을 우선한다."
        )
    if "clear" in condition or "sun" in condition:
        guidance.append("맑거나 햇빛이 강한 날씨이므로 보유한 hat이 있으면 적절한 경우에만 고려한다.")
    guidance.append("reason에는 선택한 옷의 특징과 날씨 영향이 자연스럽게 드러나야 한다.")
    return guidance


def _weather_reason_prefix(weather: Weather) -> str:
    temperature_parts: list[str] = []
    if weather.temp is not None:
        temperature_parts.append(f"현재 {_format_temperature(weather.temp)}")
    range_parts: list[str] = []
    if weather.tempMin is not None:
        range_parts.append(f"최저 {_format_temperature(weather.tempMin)}")
    if weather.tempMax is not None:
        range_parts.append(f"최고 {_format_temperature(weather.tempMax)}")
    if range_parts:
        temperature_parts.append("(" + "·".join(range_parts) + ")")
    condition = _weather_condition_label(weather.condition)
    description = " ".join(temperature_parts)
    if condition:
        description = f"{description}의 {condition}" if description else condition
    return f"{description}를 고려해" if description else ""


def _apply_weather_to_reason(reason: str, weather: Weather | None) -> str:
    if weather is None:
        return reason
    prefix = _weather_reason_prefix(weather)
    return f"{prefix} {reason}" if prefix else reason


def _json_object_candidates(text: str) -> list[str]:
    """Return balanced JSON-object candidates while respecting quoted strings."""
    candidates: list[str] = []
    for start, character in enumerate(text):
        if character != "{":
            continue
        depth = 0
        in_string = False
        escaped = False
        for end in range(start, len(text)):
            current = text[end]
            if in_string:
                if escaped:
                    escaped = False
                elif current == "\\":
                    escaped = True
                elif current == '"':
                    in_string = False
                continue
            if current == '"':
                in_string = True
            elif current == "{":
                depth += 1
            elif current == "}":
                depth -= 1
                if depth == 0:
                    candidates.append(text[start : end + 1])
                    break
    return candidates


def extract_json(text: str) -> dict[str, Any]:
    """Extract the first valid JSON object, including one after Qwen thinking/prose."""
    for candidate in _json_object_candidates(text.strip()):
        try:
            decoded = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(decoded, dict):
            return decoded
    raise RecommendationJSONError("Recommendation model returned invalid JSON.")


def _normalize_keywords(value: object) -> list[str]:
    if not isinstance(value, list):
        return ["clean", "balanced"]
    normalized: list[str] = []
    for keyword in value:
        candidate = str(keyword).strip().lower()
        if KEYWORD_RE.fullmatch(candidate) and candidate not in normalized:
            normalized.append(candidate)
        if len(normalized) == 4:
            break
    return normalized or ["clean", "balanced"]


def _normalize_title(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    title = " ".join(value.split())
    if not 2 <= len(title) <= 30:
        return None
    if not any("\uac00" <= character <= "\ud7a3" for character in title):
        return None
    if MECHANICAL_TITLE_RE.fullmatch(title):
        return None
    return title


def sanitize_recommendation(
    raw: object,
    closet_by_id: dict[int, ClosetItem],
    *,
    weather: Weather | None = None,
) -> OutfitRecommendation | None:
    """Remove invalid slot entries and reject looks missing the required top/bottom."""
    if not isinstance(raw, dict):
        return None
    raw_slots = raw.get("slots")
    raw_slots = raw_slots if isinstance(raw_slots, dict) else {}
    slots: dict[str, int | None] = {}

    for slot in OUTFIT_SLOTS:
        raw_value = raw_slots.get(slot)
        if raw_value is None or raw_value == "" or raw_value == "null":
            slots[slot] = None
            continue
        if isinstance(raw_value, bool):
            slots[slot] = None
            continue
        try:
            clothes_id = int(raw_value)
        except (TypeError, ValueError):
            slots[slot] = None
            continue
        item = closet_by_id.get(clothes_id)
        slots[slot] = clothes_id if item and item.category.value in ALLOWED_CATEGORY[slot] else None

    if slots["top"] is None or slots["bottom"] is None:
        return None
    reason = _apply_weather_to_reason(str(raw.get("reason") or "").strip(), weather)
    title = _normalize_title(raw.get("title"))
    if title is None:
        return None
    if not reason:
        return None
    return OutfitRecommendation(
        title=title,
        slots=OutfitSlots(**slots),
        reason=reason,
        styleKeywords=_normalize_keywords(raw.get("styleKeywords")),
    )


def sanitize_model_response(
    text: str,
    closet: list[ClosetItem],
    *,
    max_results: int = 2,
    weather: Weather | None = None,
) -> list[OutfitRecommendation]:
    parsed = extract_json(text)
    raw_recommendations = parsed.get("recommendations")
    if not isinstance(raw_recommendations, list):
        raise RecommendationValidationError("Recommendation model returned no recommendations.")
    closet_by_id = {item.clothesId: item for item in closet}
    recommendations = [
        recommendation
        for raw in raw_recommendations
        if (recommendation := sanitize_recommendation(raw, closet_by_id, weather=weather)) is not None
    ]
    if not recommendations:
        raise RecommendationValidationError("No valid outfit recommendation could be generated.")
    return recommendations[:max_results]


class OutfitRecommender:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model: Any | None = None
        self.tokenizer: Any | None = None
        self._load_lock = threading.Lock()

    @property
    def is_loaded(self) -> bool:
        return self.model is not None and self.tokenizer is not None

    def load(self) -> None:
        if self.is_loaded:
            return
        with self._load_lock:
            if self.is_loaded:
                return
            if not torch.cuda.is_available():
                raise RuntimeError("CUDA is not available for the recommendation model.")
            self.settings.resolved_hf_home.mkdir(parents=True, exist_ok=True)
            logger.info("Loading recommendation model: %s", self.settings.recommend_model_id)
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.settings.recommend_model_id,
                cache_dir=str(self.settings.resolved_hf_home),
                local_files_only=self.settings.local_files_only,
            )
            model_kwargs: dict[str, Any] = {
                "cache_dir": str(self.settings.resolved_hf_home),
                "local_files_only": self.settings.local_files_only,
                "device_map": {"": 0},
                "low_cpu_mem_usage": True,
            }
            if self.settings.recommend_load_in_4bit:
                model_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.float16,
                )
            self.model = AutoModelForCausalLM.from_pretrained(
                self.settings.recommend_model_id,
                **model_kwargs,
            )
            self.model.eval()
            self._log_vram("recommend-model-loaded")

    def warm_up(self) -> None:
        self.load()
        if not self.settings.enable_warmup:
            return
        messages = [{"role": "user", "content": "Respond with {}."}]
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        with torch.inference_mode():
            self.model.generate(
                **inputs,
                max_new_tokens=1,
                do_sample=False,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        torch.cuda.synchronize()
        self._log_vram("recommend-model-warmed")

    def _generate_response_text(self, messages: list[dict[str, str]]) -> tuple[str, int]:
        """Generate one completion and return its decoded text and token count."""
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        with torch.inference_mode():
            output = self.model.generate(
                **inputs,
                max_new_tokens=self.settings.recommend_max_new_tokens,
                do_sample=False,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        if torch.cuda.is_available():
            torch.cuda.synchronize()
        generated = output[0][inputs["input_ids"].shape[1] :]
        return self.tokenizer.decode(generated, skip_special_tokens=True), generated.shape[-1]

    @staticmethod
    def _log_invalid_json_response(text: str, attempt: int) -> None:
        preview = text.replace("\r", "\\r").replace("\n", "\\n")[:1200]
        logger.warning(
            "Recommendation model returned invalid JSON: attempt=%s/2 chars=%s preview=%r",
            attempt,
            len(text),
            preview,
        )

    def recommend(
        self,
        situation: str,
        closet: list[ClosetItem],
        model_gender: ModelGender,
        weather: Weather | None = None,
    ) -> tuple[list[OutfitRecommendation], int]:
        self.load()
        messages: list[dict[str, str]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_message(situation, closet, model_gender, weather)},
        ]
        started = time.perf_counter()
        total_generated_tokens = 0
        for attempt in range(1, 3):
            text, generated_tokens = self._generate_response_text(messages)
            total_generated_tokens += generated_tokens
            try:
                recommendations = sanitize_model_response(
                    text,
                    closet,
                    max_results=self.settings.recommend_max_results,
                    weather=weather,
                )
                break
            except RecommendationJSONError:
                self._log_invalid_json_response(text, attempt)
                if attempt == 2:
                    raise
                messages.extend(
                    [
                        {"role": "assistant", "content": text},
                        {
                            "role": "user",
                            "content": (
                                "방금 응답은 유효한 JSON이 아닙니다. 설명, Markdown, <think> 태그 없이 "
                                "요청한 recommendations JSON 객체만 다시 반환하세요."
                            ),
                        },
                    ]
                )
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Recommendation inference completed: processing_ms=%s generated_tokens=%s attempts=%s",
            elapsed_ms,
            total_generated_tokens,
            attempt,
        )
        self._log_vram("recommend-inference")
        return recommendations, elapsed_ms

    @staticmethod
    def _log_vram(stage: str) -> None:
        if torch.cuda.is_available():
            allocated = torch.cuda.memory_allocated() / 1024**2
            reserved = torch.cuda.memory_reserved() / 1024**2
            logger.info("VRAM %s: allocated_mb=%.0f reserved_mb=%.0f", stage, allocated, reserved)
