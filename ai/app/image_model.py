from __future__ import annotations

import logging
import threading
import time
from typing import Any

import torch
from diffusers import ControlNetModel, DiffusionPipeline, SanaPAGPipeline, StableDiffusionXLControlNetPipeline
from PIL import Image

from .config import Settings
from .pose_control import build_standing_openpose_image
from .prompt_labels import describe_item
from .schemas import ImageItem, ModelGender

logger = logging.getLogger(__name__)
PROMPT_TEMPLATE = (
    "High-end realistic full-length Korean fashion editorial photograph of exactly one {model_description}, head-to-toe. "
    "Gender is fixed to {model_gender}; do not use another gender, mixed genders, or multiple models. "
    "The entire body is inside the frame with space above the head and below the shoes; a wide full-body composition, "
    "relaxed standing pose, exactly two arms, exactly two legs, both hands and both feet visible. "
    "Strict outfit requirements: {wearing}. Preserve every named garment category, color, and pattern; do not replace "
    "or omit garments. Natural human anatomy, professional studio lighting, realistic fabric weave and drape, "
    "detailed tailoring, sharp focus, premium fashion magazine photography."
)
MODEL_DESCRIPTIONS = {
    ModelGender.MALE: "Korean East Asian adult male fashion model",
    ModelGender.FEMALE: "Korean East Asian adult female fashion model",
}
NEGATIVE_PROMPT = (
    "bad anatomy, bad proportions, malformed limbs, deformed limbs, extra arms, extra legs, "
    "extra hands, extra feet, extra fingers, missing limbs, missing fingers, fused fingers, "
    "duplicate person, multiple people, cloned body, cropped, cropped body, cut off head, cut off feet, "
    "close-up, closeup, portrait, upper body, torso only, out of frame, partial body, "
    "blurry, low detail, low resolution, out of focus, plastic skin, distorted face, text, watermark"
)


def build_prompt(items: list[ImageItem], style_keywords: list[str], model_gender: ModelGender) -> str:
    clothing = [describe_item(item.category, item.subcategory, item.colors, item.pattern) for item in items]
    details = [part for part in clothing if part]
    keywords = [keyword.strip().lower() for keyword in style_keywords if keyword.strip()]
    if keywords:
        details.append(", ".join(keywords[:4]))
    return PROMPT_TEMPLATE.format(
        model_description=MODEL_DESCRIPTIONS[model_gender],
        model_gender=model_gender.value,
        wearing=", ".join(details),
    )


class OutfitImageGenerator:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.pipe: Any | None = None
        self._load_lock = threading.Lock()
        self.controlnet_loaded = False
        self.ip_adapter_loaded = False

    @property
    def is_loaded(self) -> bool:
        return self.pipe is not None

    def load(self) -> None:
        if self.is_loaded:
            return
        with self._load_lock:
            if self.is_loaded:
                return
            if not torch.cuda.is_available():
                raise RuntimeError("CUDA is not available for the image generation model.")
            self.settings.resolved_hf_home.mkdir(parents=True, exist_ok=True)
            logger.info(
                "Loading image model: preset=%s id=%s",
                self.settings.image_model_preset,
                self.settings.image_model_id,
            )
            is_sana = self.settings.image_model_preset == "sana_1_5"
            # The model_index.json selects the right pipeline class (SD 1.5 or SDXL).
            load_options: dict[str, Any] = {
                "cache_dir": str(self.settings.resolved_hf_home),
                "local_files_only": self.settings.local_files_only,
                "torch_dtype": torch.float16,
                "safety_checker": None,
            }
            if self.settings.image_model_variant:
                load_options["variant"] = self.settings.image_model_variant
            if is_sana:
                pipe = SanaPAGPipeline.from_pretrained(
                    self.settings.resolved_image_model_source,
                    cache_dir=str(self.settings.resolved_hf_home),
                    local_files_only=self.settings.local_files_only,
                    torch_dtype=torch.bfloat16,
                    pag_applied_layers="transformer_blocks.8",
                )
            elif self.settings.image_controlnet_enabled:
                controlnet = ControlNetModel.from_pretrained(
                    self.settings.image_controlnet_model_id,
                    cache_dir=str(self.settings.resolved_hf_home),
                    local_files_only=self.settings.local_files_only,
                    torch_dtype=torch.float16,
                )
                pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
                    self.settings.resolved_image_model_source,
                    controlnet=controlnet,
                    **load_options,
                )
            else:
                pipe = DiffusionPipeline.from_pretrained(self.settings.resolved_image_model_source, **load_options)
            pipe.set_progress_bar_config(disable=True)
            pipe.enable_vae_slicing()
            pipe.enable_vae_tiling()
            if self.settings.image_reference_enabled:
                self._load_ip_adapter(pipe)
            else:
                pipe.enable_attention_slicing()
            if self.settings.image_offload:
                pipe.enable_model_cpu_offload()
            else:
                pipe.to("cuda")
            self.pipe = pipe
            self.controlnet_loaded = self.settings.image_controlnet_enabled
            self._log_vram("image-model-loaded")

    def _load_ip_adapter(self, pipe: Any) -> None:
        if not hasattr(pipe, "load_ip_adapter") or not hasattr(pipe, "set_ip_adapter_scale"):
            raise RuntimeError("The selected image pipeline does not support IP-Adapter.")
        logger.info(
            "Loading IP-Adapter: repo=%s subfolder=%s weight=%s scale=%.2f",
            self.settings.image_reference_adapter_repo,
            self.settings.image_reference_adapter_subfolder,
            self.settings.image_reference_adapter_weight,
            self.settings.image_reference_scale,
        )
        pipe.load_ip_adapter(
            self.settings.image_reference_adapter_repo,
            subfolder=self.settings.image_reference_adapter_subfolder,
            weight_name=self.settings.image_reference_adapter_weight,
            image_encoder_folder=self.settings.image_reference_adapter_image_encoder_folder,
            cache_dir=str(self.settings.resolved_hf_home),
            local_files_only=self.settings.local_files_only,
        )
        pipe.set_ip_adapter_scale(self.settings.image_reference_scale)
        self.ip_adapter_loaded = True

    def warm_up(self) -> None:
        self.load()
        if not self.settings.enable_warmup:
            return
        call_options: dict[str, Any] = {
            "prompt": "realistic fashion photograph",
            "negative_prompt": NEGATIVE_PROMPT,
            "num_inference_steps": 1,
            "guidance_scale": self.settings.image_cfg if self.settings.image_model_preset == "sana_1_5" else 1.0,
            "width": self.settings.image_width if self.settings.image_model_preset == "sana_1_5" else 256,
            "height": self.settings.image_height if self.settings.image_model_preset == "sana_1_5" else 256,
        }
        if self.settings.image_model_preset == "sana_1_5":
            call_options.update(self._sana_quality_options())
        if self.settings.image_controlnet_enabled:
            call_options["image"] = build_standing_openpose_image(256, 256)
            call_options["controlnet_conditioning_scale"] = self.settings.image_controlnet_scale
        if self.ip_adapter_loaded:
            call_options["ip_adapter_image"] = self._neutral_reference_image()
        with torch.inference_mode():
            self.pipe(**call_options)
        torch.cuda.synchronize()
        self._log_vram("image-model-warmed")

    def generate(
        self,
        items: list[ImageItem],
        style_keywords: list[str],
        model_gender: ModelGender,
        reference_image: Image.Image | None = None,
    ) -> Image.Image:
        self.load()
        started = time.perf_counter()
        call_options: dict[str, Any] = {
            "prompt": build_prompt(items, style_keywords, model_gender),
            "negative_prompt": NEGATIVE_PROMPT,
            "num_inference_steps": self.settings.image_steps,
            "guidance_scale": self.settings.image_cfg,
            "width": self.settings.image_width,
            "height": self.settings.image_height,
        }
        if self.settings.image_model_preset == "sana_1_5":
            call_options.update(self._sana_quality_options())
        if reference_image is not None and not self.settings.image_reference_enabled:
            raise RuntimeError("Reference image was supplied while IP-Adapter is disabled.")
        if self.ip_adapter_loaded:
            call_options["ip_adapter_image"] = reference_image or self._neutral_reference_image()
        if self.settings.image_controlnet_enabled:
            call_options["image"] = build_standing_openpose_image(
                self.settings.image_width,
                self.settings.image_height,
            )
            call_options["controlnet_conditioning_scale"] = self.settings.image_controlnet_scale
        with torch.inference_mode():
            result = self.pipe(**call_options)
        torch.cuda.synchronize()
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Image inference completed: processing_ms=%s reference_image=%s", elapsed_ms, reference_image is not None
        )
        self._log_vram("image-inference")
        return result.images[0]

    def _sana_quality_options(self) -> dict[str, Any]:
        options: dict[str, Any] = {
            "max_sequence_length": self.settings.image_sana_max_sequence_length,
            "pag_scale": self.settings.image_sana_pag_scale,
            "pag_adaptive_scale": self.settings.image_sana_pag_adaptive_scale,
        }
        if not self.settings.image_sana_use_complex_human_instruction:
            options["complex_human_instruction"] = None
        return options

    @staticmethod
    def _neutral_reference_image() -> Image.Image:
        return Image.new("RGB", (224, 224), (127, 127, 127))

    @staticmethod
    def _log_vram(stage: str) -> None:
        if torch.cuda.is_available():
            allocated = torch.cuda.memory_allocated() / 1024**2
            reserved = torch.cuda.memory_reserved() / 1024**2
            logger.info("VRAM %s: allocated_mb=%.0f reserved_mb=%.0f", stage, allocated, reserved)
