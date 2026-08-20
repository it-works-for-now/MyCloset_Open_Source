from __future__ import annotations

import asyncio
import io
import json
import threading
import time

import pytest
import torch
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.gpu_manager import GPUInferenceManager
from app.image_model import build_prompt
from app.main import create_app
from app.pose_control import build_standing_openpose_image
from app.recommend_model import (
    SYSTEM_PROMPT,
    OutfitRecommender,
    RecommendationValidationError,
    _build_user_message,
    extract_json,
    sanitize_model_response,
)
from app.reference_image import ReferenceImage, ReferenceImageFetchError, validate_reference_url
from app.schemas import (
    Category,
    ClosetItem,
    Color,
    GarmentAttributes,
    ImageItem,
    ModelGender,
    OutfitRecommendation,
    OutfitSlots,
    Pattern,
    Season,
    StyleTag,
    Weather,
)


class FakeRecommender:
    is_loaded = True

    def __init__(self):
        self.weather: Weather | None = None
        self.model_gender: ModelGender | None = None
        self.calls = 0

    def recommend(
        self,
        situation: str,
        closet: list[ClosetItem],
        model_gender: ModelGender,
        weather: Weather | None = None,
    ):
        self.calls += 1
        self.weather = weather
        self.model_gender = model_gender
        recommendations = [
            OutfitRecommendation(
                title="\uac00\uc744 \uce74\ud398 \ubbf8\ub2c8\uba40 \ub8e9",
                slots=OutfitSlots(top=101, bottom=202, shoes=303),
                reason=f"{situation}에 어울리는 깔끔한 코디입니다.",
                styleKeywords=["casual", "clean"],
            )
            for _ in range(3)
        ]
        return recommendations, 12


class ErrorRecommender(FakeRecommender):
    def recommend(
        self,
        situation: str,
        closet: list[ClosetItem],
        model_gender: ModelGender,
        weather: Weather | None = None,
    ):
        raise RuntimeError("GPU error")


class FakeImageGenerator:
    is_loaded = True

    def __init__(self):
        self.reference_image: Image.Image | None = None
        self.model_gender: ModelGender | None = None
        self.calls = 0

    def generate(self, items, style_keywords, model_gender: ModelGender, reference_image: Image.Image | None = None):
        self.calls += 1
        self.model_gender = model_gender
        self.reference_image = reference_image
        return Image.new("RGB", (2, 2), "white")


class ErrorImageGenerator(FakeImageGenerator):
    def generate(self, items, style_keywords, model_gender: ModelGender, reference_image: Image.Image | None = None):
        raise RuntimeError("GPU error")


class FakeClassifier:
    """Stands in for Qwen2.5-VL so the analysis endpoint can be tested without a GPU."""

    is_loaded = True

    def __init__(self, attributes: GarmentAttributes | None = None, error: Exception | None = None):
        self.attributes = attributes or GarmentAttributes(
            category=Category.TOP,
            subcategory="SHIRT",
            colors=[Color.WHITE],
            pattern=Pattern.SOLID,
            seasons=[Season.SPRING, Season.FALL],
            styleTags=[StyleTag.CASUAL],
            warmthLevel=2,
        )
        self.error = error
        self.received: Image.Image | None = None

    def warm_up(self) -> None:
        return None

    def analyze(self, image: Image.Image):
        if self.error is not None:
            raise self.error
        self.received = image
        return self.attributes, 42


class FakeReferenceFetcher:
    def __init__(self, reference: ReferenceImage | None = None):
        self.reference = reference
        self.items: list[ImageItem] = []

    def fetch(self, items: list[ImageItem]) -> ReferenceImage | None:
        self.items = items
        return self.reference


def _settings() -> Settings:
    return Settings(ai_api_key="test-key", enable_warmup=False, image_model_preset="dreamshaper")


def test_realvisxl_lightning_profile_overrides_legacy_image_settings() -> None:
    settings = Settings(
        image_model_preset="realvisxl_lightning",
        image_model_id="example/manual-model",
        image_steps=22,
        image_cfg=7.5,
        image_width=512,
        image_height=768,
        image_offload=False,
    )
    assert settings.image_model_id == "SG161222/RealVisXL_V5.0_Lightning"
    assert settings.image_model_variant is None
    assert settings.image_steps == 5
    assert settings.image_cfg == 1.5
    assert (settings.image_width, settings.image_height) == (768, 1152)
    assert settings.image_reference_adapter_image_encoder_folder == "models/image_encoder"
    assert settings.image_offload is True
    assert settings.image_reference_adapter_weight == "ip-adapter-plus_sdxl_vit-h.safetensors"


def test_standing_pose_control_image_is_full_size_and_not_blank() -> None:
    image = build_standing_openpose_image(768, 1152)
    assert image.mode == "RGB"
    assert image.size == (768, 1152)
    assert image.getbbox() is not None


def test_sana_profile_uses_sana_defaults_and_disables_sdxl_only_features() -> None:
    settings = Settings(
        image_model_preset="sana_1_5",
        image_reference_enabled=True,
        image_controlnet_enabled=True,
    )
    assert settings.image_model_id == "Efficient-Large-Model/SANA1.5_1.6B_1024px_diffusers"
    assert (settings.image_steps, settings.image_cfg) == (24, 5.0)
    assert (settings.image_width, settings.image_height) == (768, 1152)
    assert settings.image_offload is True
    assert settings.image_sana_pag_scale == 2.0
    assert settings.image_sana_max_sequence_length == 300
    assert settings.image_sana_use_complex_human_instruction is True
    assert settings.image_reference_enabled is False
    assert settings.image_controlnet_enabled is False


def test_recommendation_prompt_requires_natural_nonrepetitive_reasons() -> None:
    assert "같은 의류명, 색상+의류명, clothesId, 슬롯을 반복하지 마세요." in SYSTEM_PROMPT
    assert '액세서리를 "입는다"고 표현하지 마세요.' in SYSTEM_PROMPT


def test_weather_prompt_contains_full_snapshot_and_hot_weather_guidance() -> None:
    weather = Weather(temp=28.4, tempMin=26.8, tempMax=30.1, condition="clear sky")
    message = _build_user_message(
        "여름 대학 등교룩", [ClosetItem.model_validate(item) for item in _closet()], ModelGender.MALE, weather
    )

    assert "[날씨 정보]" in message
    assert '"temp": 28.4' in message
    assert '"tempMin": 26.8' in message
    assert '"tempMax": 30.1' in message
    assert '"condition": "clear sky"' in message
    assert "더운 날씨" in message
    assert "hat" in message


def test_rainy_weather_guidance_and_reason_are_reflected() -> None:
    weather = Weather(temp=18.0, tempMin=16.0, tempMax=20.0, condition="light rain")
    message = _build_user_message(
        "출근룩", [ClosetItem.model_validate(item) for item in _closet()], ModelGender.FEMALE, weather
    )
    raw = {
        "recommendations": [
            {
                "title": "비 오는 날 출근룩",
                "slots": {"top": 101, "bottom": 202, "shoes": 303},
                "reason": "셔츠와 슬랙스를 편안하게 매치한 출근 코디입니다.",
                "styleKeywords": ["clean", "casual"],
            }
        ]
    }

    recommendations = sanitize_model_response(
        json.dumps(raw, ensure_ascii=False),
        [ClosetItem.model_validate(item) for item in _closet()],
        weather=weather,
    )
    assert "강수 가능성" in message
    assert recommendations[0].reason.startswith("현재 18°C (최저 16°C·최고 20°C)의 비 오는 날씨를 고려해")


def test_hot_weather_reason_is_reflected_and_null_weather_adds_nothing() -> None:
    raw = {
        "recommendations": [
            {
                "title": "여름 캠퍼스 룩",
                "slots": {"top": 101, "bottom": 202, "shoes": 303},
                "reason": "밝은 셔츠와 가벼운 슬랙스를 조합한 캠퍼스 코디입니다.",
                "styleKeywords": ["light", "casual"],
            }
        ]
    }
    closet = [ClosetItem.model_validate(item) for item in _closet()]
    hot = Weather(temp=29.0, tempMin=27.0, tempMax=31.0, condition="clear sky")

    hot_recommendation = sanitize_model_response(json.dumps(raw, ensure_ascii=False), closet, weather=hot)[0]
    no_weather_recommendation = sanitize_model_response(json.dumps(raw, ensure_ascii=False), closet, weather=None)[0]
    no_weather_message = _build_user_message("대학 등교룩", closet, ModelGender.MALE, None)

    assert hot_recommendation.reason.startswith("현재 29°C (최저 27°C·최고 31°C)의 맑은 날씨를 고려해")
    assert no_weather_recommendation.reason == raw["recommendations"][0]["reason"]
    assert "[날씨 정보]" not in no_weather_message


def test_recommendation_api_forwards_weather_and_keeps_closet_slot_ids() -> None:
    recommender = FakeRecommender()
    app = create_app(_settings(), recommender, FakeImageGenerator(), preload_models=False)
    with TestClient(app) as client:
        response = client.post(
            "/v1/daily-look/recommend",
            headers={"X-API-Key": "test-key"},
            json={
                "situation": "여름 대학 등교룩",
                "closet": _closet(),
                "weather": {"temp": 28.4, "tempMin": 26.8, "tempMax": 30.1, "condition": "clear sky"},
                "modelGender": "female",
            },
        )

    assert response.status_code == 200
    assert recommender.weather is not None
    assert recommender.weather.condition == "clear sky"
    assert recommender.model_gender is ModelGender.FEMALE
    closet_ids = {item["clothesId"] for item in _closet()}
    for recommendation in response.json()["recommendations"]:
        assert {value for value in recommendation["slots"].values() if value is not None} <= closet_ids


def test_custom_image_profile_keeps_manual_settings() -> None:
    settings = Settings(image_model_preset="custom", image_model_id="example/manual-model", image_steps=12)
    assert settings.image_model_id == "example/manual-model"
    assert settings.image_steps == 12
    assert settings.image_model_variant is None


def test_image_prompt_includes_all_colors_pattern_and_model_gender() -> None:
    items = [
        ImageItem(
            slot="top",
            category="TOP",
            subcategory="SHIRT",
            colors=["WHITE", "BLUE"],
            pattern="STRIPE",
        )
    ]
    male_prompt = build_prompt(items, ["casual"], ModelGender.MALE)
    female_prompt = build_prompt(items, ["casual"], ModelGender.FEMALE)
    assert "Korean East Asian adult male fashion model" in male_prompt
    assert "Gender is fixed to male" in male_prompt
    assert "Korean East Asian adult female fashion model" in female_prompt
    assert "Gender is fixed to female" in female_prompt
    assert "white and blue striped shirt" in male_prompt


def test_recommendation_prompt_includes_fixed_model_gender() -> None:
    closet = [ClosetItem.model_validate(item) for item in _closet()]
    male_prompt = _build_user_message("대학 등교룩", closet, ModelGender.MALE)
    female_prompt = _build_user_message("대학 등교룩", closet, ModelGender.FEMALE)
    assert "modelGender: male" in male_prompt
    assert "성인 남성 패션 모델 한 명" in male_prompt
    assert "modelGender: female" in female_prompt
    assert "성인 여성 패션 모델 한 명" in female_prompt


def _closet() -> list[dict]:
    return [
        {"clothesId": 101, "category": "TOP", "subcategory": "SHIRT", "colors": ["WHITE"], "seasons": ["FALL"]},
        {"clothesId": 202, "category": "BOTTOM", "subcategory": "SLACKS", "colors": ["BLACK"], "seasons": ["FALL"]},
        {"clothesId": 303, "category": "SHOES", "subcategory": "SNEAKERS", "colors": ["WHITE"], "seasons": ["FALL"]},
    ]


@pytest.fixture
def client():
    app = create_app(_settings(), FakeRecommender(), FakeImageGenerator(), preload_models=False)
    with TestClient(app) as test_client:
        yield test_client


def test_health_schema(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["imageModel"]["preset"] == "dreamshaper"
    assert body["status"] == "ready"
    assert body["recommendModel"]["id"] == "Qwen/Qwen3-4B-Instruct-2507"
    assert body["recommendModel"]["loaded"] is True
    assert body["imageModel"]["width"] == 512


def test_api_key_missing_or_invalid_returns_401(client: TestClient) -> None:
    payload = {"situation": "카페", "closet": _closet(), "modelGender": "male"}
    for headers in ({}, {"X-API-Key": "wrong"}):
        response = client.post("/v1/daily-look/recommend", headers=headers, json=payload)
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid AI API key."}


def test_recommendation_contract(client: TestClient) -> None:
    response = client.post(
        "/v1/daily-look/recommend",
        headers={"X-API-Key": "test-key"},
        json={"situation": "가을 카페", "closet": _closet(), "modelGender": "male"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "Qwen/Qwen3-4B-Instruct-2507"
    assert body["processingMs"] == 12
    assert len(body["recommendations"]) == 2
    for recommendation in body["recommendations"]:
        assert 2 <= len(recommendation["title"]) <= 30
        assert recommendation["title"].strip()
        assert recommendation["slots"]["top"] == 101
        assert recommendation["reason"]
        assert recommendation["styleKeywords"] == ["casual", "clean"]
    assert body["recommendations"][0]["slots"]["top"] == 101


def test_empty_closet_and_empty_items_are_422(client: TestClient) -> None:
    headers = {"X-API-Key": "test-key"}
    recommend = client.post(
        "/v1/daily-look/recommend", headers=headers, json={"situation": "카페", "closet": [], "modelGender": "male"}
    )
    image = client.post(
        "/v1/daily-look/image", headers=headers, json={"items": [], "styleKeywords": [], "modelGender": "female"}
    )
    assert recommend.status_code == 422
    assert image.status_code == 422


@pytest.mark.parametrize(
    ("include_gender", "invalid_gender"),
    [(False, None), (True, None), (True, ""), (True, "nonbinary"), (True, "MALE")],
)
def test_model_gender_is_required_and_rejected_before_model_calls(include_gender, invalid_gender) -> None:
    recommender = FakeRecommender()
    image_generator = FakeImageGenerator()
    app = create_app(_settings(), recommender, image_generator, preload_models=False)
    headers = {"X-API-Key": "test-key"}
    recommend_payload = {"situation": "카페", "closet": _closet()}
    image_payload = {"items": [{"slot": "top", "category": "TOP"}], "styleKeywords": []}
    if include_gender:
        recommend_payload["modelGender"] = invalid_gender
        image_payload["modelGender"] = invalid_gender

    with TestClient(app) as client:
        recommend = client.post("/v1/daily-look/recommend", headers=headers, json=recommend_payload)
        image = client.post("/v1/daily-look/image", headers=headers, json=image_payload)

    assert recommend.status_code == 422
    assert image.status_code == 422
    assert recommender.calls == 0
    assert image_generator.calls == 0


def test_image_response_is_png(client: TestClient) -> None:
    response = client.post(
        "/v1/daily-look/image",
        headers={"X-API-Key": "test-key"},
        json={
            "items": [{"slot": "top", "category": "TOP", "subcategory": "SHIRT", "colors": ["WHITE"]}],
            "styleKeywords": ["clean"],
            "modelGender": "female",
        },
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG")


def test_image_request_forwards_backend_image_url_to_ip_adapter() -> None:
    image_generator = FakeImageGenerator()
    reference = ReferenceImage(slot="top", image=Image.new("RGB", (2, 2), "black"), source_host="backend.local")
    reference_fetcher = FakeReferenceFetcher(reference)
    app = create_app(
        _settings(),
        FakeRecommender(),
        image_generator,
        reference_fetcher=reference_fetcher,
        preload_models=False,
    )
    with TestClient(app) as client:
        response = client.post(
            "/v1/daily-look/image",
            headers={"X-API-Key": "test-key"},
            json={
                "items": [
                    {
                        "slot": "top",
                        "category": "TOP",
                        "imageUrl": "http://backend.local:8080/uploads/clothes/1/shirt.jpg",
                    }
                ],
                "styleKeywords": ["clean"],
                "modelGender": "male",
            },
        )

    assert response.status_code == 200
    assert reference_fetcher.items[0].imageUrl == "http://backend.local:8080/uploads/clothes/1/shirt.jpg"
    assert image_generator.reference_image is reference.image
    assert image_generator.model_gender is ModelGender.MALE


def test_reference_url_requires_trusted_backend_upload_location() -> None:
    options = {
        "allowed_hosts": frozenset({"backend.local"}),
        "allowed_ports": frozenset({8080}),
        "path_prefix": "/uploads/clothes/",
    }
    url = "http://backend.local:8080/uploads/clothes/1/shirt.jpg"
    assert validate_reference_url(url, **options) == url

    for rejected_url in (
        "http://127.0.0.1:8080/uploads/clothes/1/shirt.jpg",
        "http://backend.local:8080/uploads/daily-look/1/image.png",
        "http://backend.local:9000/uploads/clothes/1/shirt.jpg",
    ):
        with pytest.raises(ReferenceImageFetchError):
            validate_reference_url(rejected_url, **options)


def test_model_runtime_errors_are_503() -> None:
    app = create_app(_settings(), ErrorRecommender(), ErrorImageGenerator(), preload_models=False)
    with TestClient(app) as client:
        headers = {"X-API-Key": "test-key"}
        recommend = client.post(
            "/v1/daily-look/recommend",
            headers=headers,
            json={"situation": "카페", "closet": _closet(), "modelGender": "male"},
        )
        image = client.post(
            "/v1/daily-look/image",
            headers=headers,
            json={"items": [{"slot": "top", "category": "TOP"}], "modelGender": "female"},
        )
    assert recommend.status_code == 503
    assert image.status_code == 503


def test_sanitizer_removes_unknown_ids_and_wrong_slot_categories() -> None:
    closet = [ClosetItem.model_validate(item) for item in _closet()]
    raw = {
        "recommendations": [
            {
                "title": "\uc120\uc120\ud55c \ub0a0\uc758 \ubbf8\ub2c8\uba40 \ub8e9",
                "slots": {"top": 101, "bottom": 202, "shoes": 303, "outer": 202, "hat": 999},
                "reason": "입력된 옷만 활용했습니다.",
                "styleKeywords": ["clean", "가을"],
            },
            {"slots": {"top": 999, "bottom": 202}, "reason": "무효", "styleKeywords": ["bad"]},
        ]
    }
    recommendations = sanitize_model_response(
        json.dumps(raw, ensure_ascii=False),
        closet,
        weather=Weather(temp=12.0, tempMin=8.0, tempMax=14.0, condition="overcast clouds"),
    )
    assert len(recommendations) == 1
    assert recommendations[0].slots.outer is None
    assert recommendations[0].slots.hat is None
    assert recommendations[0].styleKeywords == ["clean"]


def test_sanitizer_rejects_missing_or_mechanical_titles() -> None:
    closet = [ClosetItem.model_validate(item) for item in _closet()]
    raw = {
        "recommendations": [
            {
                "title": "\ucd94\ucc9c \ub8e9 1",
                "slots": {"top": 101, "bottom": 202},
                "reason": "invalid",
                "styleKeywords": ["clean"],
            },
            {"slots": {"top": 101, "bottom": 202}, "reason": "invalid", "styleKeywords": ["clean"]},
        ]
    }
    with pytest.raises(RecommendationValidationError):
        sanitize_model_response(json.dumps(raw, ensure_ascii=False), closet)


def test_sanitizer_rejects_non_json_model_output() -> None:
    closet = [ClosetItem.model_validate(item) for item in _closet()]
    with pytest.raises(RecommendationValidationError):
        sanitize_model_response("not json", closet)


def test_json_extractor_accepts_qwen_thinking_or_prose_around_json() -> None:
    text = '<think>formatting response</think> Here is the result: {"recommendations": []} Thank you.'
    assert extract_json(text) == {"recommendations": []}


class _RetryInputs(dict):
    def to(self, _device):
        return self


class _RetryTokenizer:
    eos_token_id = 0

    def __init__(self, responses: list[str]):
        self.responses = responses
        self.messages: list[list[dict[str, str]]] = []

    def apply_chat_template(self, messages, **_kwargs):
        self.messages.append(messages.copy())
        return "prompt"

    def __call__(self, _prompt, **_kwargs):
        return _RetryInputs(input_ids=torch.tensor([[1]]))

    def decode(self, _generated, **_kwargs):
        return self.responses.pop(0)


class _RetryModel:
    device = "cpu"

    def generate(self, **_kwargs):
        return torch.tensor([[1, 2]])


def test_recommender_retries_once_after_invalid_json() -> None:
    valid = {
        "recommendations": [
            {
                "title": "가을 캠퍼스 룩",
                "slots": {"top": 101, "bottom": 202, "shoes": 303},
                "reason": "셔츠와 슬랙스를 편안하게 조합한 캠퍼스 코디입니다.",
                "styleKeywords": ["casual", "clean"],
            }
        ]
    }
    recommender = OutfitRecommender(Settings(enable_warmup=False))
    tokenizer = _RetryTokenizer(["<think>thinking</think>", json.dumps(valid, ensure_ascii=False)])
    recommender.tokenizer = tokenizer
    recommender.model = _RetryModel()

    recommendations, _ = recommender.recommend(
        "가을 캠퍼스", [ClosetItem.model_validate(item) for item in _closet()], ModelGender.MALE
    )

    assert recommendations[0].title == "가을 캠퍼스 룩"
    assert len(tokenizer.messages) == 2
    assert "유효한 JSON" in tokenizer.messages[1][-1]["content"]


def test_common_gpu_lock_serializes_recommendation_and_image_work() -> None:
    manager = GPUInferenceManager()
    active = 0
    maximum = 0
    guard = threading.Lock()

    def work() -> None:
        nonlocal active, maximum
        with guard:
            active += 1
            maximum = max(maximum, active)
        time.sleep(0.03)
        with guard:
            active -= 1

    async def run_two_operations() -> None:
        await asyncio.gather(manager.run("recommendation", work), manager.run("image", work))

    asyncio.run(run_two_operations())
    assert maximum == 1


def _analysis_app(classifier: FakeClassifier):
    return create_app(
        _settings(),
        FakeRecommender(),
        FakeImageGenerator(),
        classifier=classifier,
        preload_models=False,
    )


def test_garment_analysis_returns_attributes():
    classifier = FakeClassifier()
    client = TestClient(_analysis_app(classifier))

    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), "white").save(buffer, format="PNG")

    response = client.post(
        "/v1/garment-analysis",
        files={"image": ("shirt.png", buffer.getvalue(), "image/png")},
        headers={"X-API-Key": "test-key"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["attributes"]["category"] == "TOP"
    assert body["processingMs"] == 42
    assert body["requiresReview"] is False
    assert classifier.received is not None


def test_garment_analysis_rejects_non_image_upload():
    client = TestClient(_analysis_app(FakeClassifier()))

    response = client.post(
        "/v1/garment-analysis",
        files={"image": ("notes.txt", b"not an image", "text/plain")},
        headers={"X-API-Key": "test-key"},
    )

    assert response.status_code == 415


def test_garment_analysis_reports_uncertain_fields_for_review():
    attributes = GarmentAttributes(category=Category.TOP, uncertainFields=["colors"])
    client = TestClient(_analysis_app(FakeClassifier(attributes)))

    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), "black").save(buffer, format="PNG")

    response = client.post(
        "/v1/garment-analysis",
        files={"image": ("dark.png", buffer.getvalue(), "image/png")},
        headers={"X-API-Key": "test-key"},
    )

    assert response.status_code == 200
    assert response.json()["requiresReview"] is True


def test_health_reports_all_three_models():
    client = TestClient(_analysis_app(FakeClassifier()))

    body = client.get("/health").json()

    assert {"analysisModel", "recommendModel", "imageModel"} <= set(body)
    assert body["analysisModel"]["loaded"] is True
