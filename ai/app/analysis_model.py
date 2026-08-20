import json
import logging
import os
import re
import threading
import time
from collections.abc import Iterable

import torch
from PIL import Image
from transformers import AutoProcessor, BitsAndBytesConfig, Qwen2_5_VLForConditionalGeneration

from .config import Settings
from .schemas import (
    Category,
    Color,
    GarmentAttributes,
    Pattern,
    Season,
    StyleTag,
)

logger = logging.getLogger(__name__)

SUBCATEGORIES: dict[Category, set[str]] = {
    Category.TOP: {"TSHIRT", "SHIRT", "BLOUSE", "KNIT", "HOODIE", "SWEATSHIRT"},
    Category.BOTTOM: {"JEANS", "SLACKS", "PANTS", "SHORTS", "SKIRT", "LEGGINGS"},
    Category.OUTER: {"JACKET", "CARDIGAN", "BLAZER", "COAT", "PADDING", "VEST"},
    Category.DRESS: {"DRESS", "JUMPSUIT"},
    Category.SHOES: {"SNEAKERS", "LOAFERS", "BOOTS", "SANDALS", "HEELS", "FLATS"},
    Category.BAG: {"BACKPACK", "TOTE", "SHOULDER", "CROSSBODY"},
    Category.ACCESSORY: {"HAT", "BELT", "SCARF", "JEWELRY", "ETC"},
}

SYSTEM_PROMPT = """You classify exactly one clothing item image for a personal closet app.
Return JSON only. Do not use markdown or explanatory text.
Use only the enum codes listed below. If an attribute cannot be determined from the image, use null or an empty array and include its field name in uncertainFields.
Do not infer size, brand, material, fit, formality, price, or purchase information.

Allowed category: TOP, BOTTOM, OUTER, DRESS, SHOES, BAG, ACCESSORY.
Allowed subcategory:
TOP: TSHIRT, SHIRT, BLOUSE, KNIT, HOODIE, SWEATSHIRT.
BOTTOM: JEANS, SLACKS, PANTS, SHORTS, SKIRT, LEGGINGS.
OUTER: JACKET, CARDIGAN, BLAZER, COAT, PADDING, VEST.
DRESS: DRESS, JUMPSUIT.
SHOES: SNEAKERS, LOAFERS, BOOTS, SANDALS, HEELS, FLATS.
BAG: BACKPACK, TOTE, SHOULDER, CROSSBODY.
ACCESSORY: HAT, BELT, SCARF, JEWELRY, ETC.
Allowed colors: BLACK, WHITE, GRAY, NAVY, BLUE, RED, GREEN, BROWN, BEIGE, YELLOW, PINK, PURPLE, ORANGE, ETC.
Allowed pattern: SOLID, STRIPE, CHECK, GRAPHIC, FLORAL, OTHER.
Allowed seasons: SPRING, SUMMER, FALL, WINTER.
Allowed styleTags: CASUAL, MINIMAL, STREET, FORMAL, SPORTY.
warmthLevel must be an integer from 1 to 5 or null.

Use this exact JSON shape:
{
  "category": "TOP",
  "subcategory": "SWEATSHIRT",
  "colors": ["NAVY"],
  "pattern": "SOLID",
  "seasons": ["FALL", "WINTER"],
  "styleTags": ["CASUAL"],
  "warmthLevel": 3,
  "uncertainFields": []
}
"""


def _unique(values: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(values))


def _safe_enum_list(values: object, enum_type) -> list[str]:
    if not isinstance(values, list):
        return []
    allowed = {item.value for item in enum_type}
    return _unique([str(value).upper() for value in values if str(value).upper() in allowed])


def _extract_json(text: str) -> dict:
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = re.sub(r"^```(?:json)?\\s*|\\s*```$", "", candidate, flags=re.IGNORECASE)

    try:
        return json.loads(candidate)
    except json.JSONDecodeError as error:
        match = re.search(r"\\{.*\\}", candidate, flags=re.DOTALL)
        if not match:
            raise ValueError("Model response did not contain a JSON object.") from error
        return json.loads(match.group(0))


def normalize_attributes(raw: dict) -> GarmentAttributes:
    category_value = str(raw.get("category") or "").upper()
    category = Category(category_value) if category_value in {item.value for item in Category} else None

    subcategory = str(raw.get("subcategory") or "").upper() or None
    if category and subcategory not in SUBCATEGORIES[category]:
        subcategory = None

    pattern_value = str(raw.get("pattern") or "").upper()
    pattern = Pattern(pattern_value) if pattern_value in {item.value for item in Pattern} else None

    warmth = raw.get("warmthLevel")
    warmth = warmth if isinstance(warmth, int) and 1 <= warmth <= 5 else None

    uncertain = raw.get("uncertainFields")
    uncertain = [str(value) for value in uncertain] if isinstance(uncertain, list) else []
    if category is None:
        uncertain.append("category")
    if subcategory is None:
        uncertain.append("subcategory")
    if not raw.get("colors"):
        uncertain.append("colors")

    return GarmentAttributes(
        category=category,
        subcategory=subcategory,
        colors=_safe_enum_list(raw.get("colors"), Color),
        pattern=pattern,
        seasons=_safe_enum_list(raw.get("seasons"), Season),
        styleTags=_safe_enum_list(raw.get("styleTags"), StyleTag),
        warmthLevel=warmth,
        uncertainFields=_unique(uncertain),
    )


class GarmentClassifier:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = None
        self.processor = None
        self.load_lock = threading.Lock()
        self.inference_lock = threading.Lock()

    @property
    def is_loaded(self) -> bool:
        return self.model is not None and self.processor is not None

    def load(self) -> None:
        if self.is_loaded:
            return

        with self.load_lock:
            if self.is_loaded:
                return

            if self.settings.analysis_device == "cuda" and not torch.cuda.is_available():
                raise RuntimeError("CUDA is not available. Install a CUDA-enabled PyTorch build or set DEVICE=cpu.")

            self.settings.resolved_hf_home.mkdir(parents=True, exist_ok=True)
            os.environ.setdefault("HF_HOME", str(self.settings.resolved_hf_home))

            model_kwargs = {
                "torch_dtype": torch.float16 if self.settings.analysis_device == "cuda" else torch.float32,
                "device_map": "auto" if self.settings.analysis_device == "cuda" else "cpu",
                "cache_dir": str(self.settings.resolved_hf_home),
            }
            if self.settings.analysis_load_in_4bit:
                model_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                )

            logger.info("Loading model %s", self.settings.analysis_model_id)
            self.processor = AutoProcessor.from_pretrained(
                self.settings.analysis_model_id,
                min_pixels=self.settings.analysis_min_pixels,
                max_pixels=self.settings.analysis_max_pixels,
                cache_dir=str(self.settings.resolved_hf_home),
                local_files_only=self.settings.local_files_only,
            )
            self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                self.settings.analysis_model_id,
                local_files_only=self.settings.local_files_only,
                **model_kwargs,
            )
            self.model.eval()
            logger.info("Model loaded")

    def analyze(self, image: Image.Image) -> tuple[GarmentAttributes, int]:
        self.load()
        started_at = time.perf_counter()

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": SYSTEM_PROMPT},
                ],
            }
        ]
        prompt = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.processor(text=[prompt], images=[image], padding=True, return_tensors="pt")
        inputs = inputs.to(self.model.device)

        # One request at a time prevents OOM on the 8 GB RTX 3060 Ti.
        with self.inference_lock, torch.inference_mode():
            generated_ids = self.model.generate(
                **inputs,
                do_sample=False,
                max_new_tokens=self.settings.analysis_max_new_tokens,
            )

        generated_ids = generated_ids[:, inputs.input_ids.shape[1] :]
        output = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        attributes = normalize_attributes(_extract_json(output))
        elapsed_ms = int((time.perf_counter() - started_at) * 1000)
        return attributes, elapsed_ms

    def warm_up(self) -> None:
        """Alias used by the server lifespan so all three models share one interface."""
        self.load()
