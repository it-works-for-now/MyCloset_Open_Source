from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, PositiveInt, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ImageModelPreset = Literal["sana_1_5", "dreamshaper", "realvisxl_lightning", "realvisxl_fast", "custom"]


_IMAGE_MODEL_PRESETS: dict[str, dict[str, object]] = {
    "dreamshaper": {
        "image_model_id": "Lykon/dreamshaper-8",
        "image_model_variant": None,
        "image_steps": 22,
        "image_cfg": 7.5,
        "image_width": 512,
        "image_height": 768,
        "image_reference_adapter_subfolder": "models",
        "image_reference_adapter_weight": "ip-adapter_sd15.bin",
        "image_offload": False,
    },
    "realvisxl_lightning": {
        "image_model_id": "SG161222/RealVisXL_V5.0_Lightning",
        "image_model_variant": None,
        "image_steps": 5,
        "image_cfg": 1.5,
        "image_width": 768,
        "image_height": 1152,
        "image_reference_adapter_subfolder": "sdxl_models",
        "image_reference_adapter_weight": "ip-adapter-plus_sdxl_vit-h.safetensors",
        "image_offload": True,
    },
    "realvisxl_fast": {
        "image_model_id": "SG161222/RealVisXL_V5.0_Lightning",
        "image_model_variant": None,
        "image_steps": 5,
        "image_cfg": 1.5,
        "image_width": 512,
        "image_height": 768,
        "image_reference_adapter_subfolder": "sdxl_models",
        "image_reference_adapter_weight": "ip-adapter-plus_sdxl_vit-h.safetensors",
        "image_offload": True,
    },
    "sana_1_5": {
        "image_model_id": "Efficient-Large-Model/SANA1.5_1.6B_1024px_diffusers",
        "image_model_variant": None,
        "image_steps": 24,
        "image_cfg": 5.0,
        "image_sana_pag_scale": 2.0,
        "image_sana_pag_adaptive_scale": 0.0,
        "image_sana_max_sequence_length": 300,
        "image_sana_use_complex_human_instruction": True,
        "image_width": 768,
        "image_height": 1152,
        "image_offload": True,
        "image_reference_enabled": False,
        "image_controlnet_enabled": False,
    },
}

PROJECT_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Configuration read from an optional, git-ignored .env file."""

    host: str = "0.0.0.0"
    port: int = Field(default=8001, ge=1, le=65535)
    log_level: str = "info"
    ai_api_key: str = ""

    hf_home: str = ".model-cache"
    local_files_only: bool = False

    analysis_model_id: str = "Qwen/Qwen2.5-VL-3B-Instruct"
    analysis_load_in_4bit: bool = True
    analysis_device: str = "cuda"
    analysis_max_new_tokens: PositiveInt = 192
    analysis_min_pixels: PositiveInt = 256 * 28 * 28
    analysis_max_pixels: PositiveInt = 512 * 28 * 28
    analysis_max_side: PositiveInt = 768

    recommend_model_id: str = "Qwen/Qwen3-4B-Instruct-2507"
    recommend_load_in_4bit: bool = True
    recommend_max_new_tokens: PositiveInt = 512
    recommend_max_results: int = Field(default=2, ge=1, le=3)
    image_model_preset: ImageModelPreset = "sana_1_5"

    image_model_id: str = "Efficient-Large-Model/SANA1.5_1.6B_1024px_diffusers"
    image_model_local_path: str = ""
    image_model_variant: str | None = None
    image_steps: PositiveInt = 24
    image_cfg: float = Field(default=5.0, gt=0, le=30)
    image_sana_pag_scale: float = Field(default=2.0, ge=0, le=10)
    image_sana_pag_adaptive_scale: float = Field(default=0.0, ge=0, le=10)
    image_sana_max_sequence_length: PositiveInt = 300
    image_sana_use_complex_human_instruction: bool = True
    image_width: PositiveInt = 768
    image_height: PositiveInt = 1152
    image_offload: bool = True
    image_reference_enabled: bool = False
    image_reference_scale: float = Field(default=0.55, ge=0, le=1)
    image_reference_adapter_repo: str = "h94/IP-Adapter"
    image_reference_adapter_subfolder: str = "sdxl_models"
    image_reference_adapter_weight: str = "ip-adapter_sdxl.bin"
    image_reference_adapter_image_encoder_folder: str = "models/image_encoder"
    image_reference_allowed_hosts: str = ""
    image_reference_allowed_ports: str = "80,443,8080"
    image_reference_path_prefix: str = "/uploads/clothes/"
    image_reference_timeout_seconds: PositiveInt = 10
    image_reference_max_bytes: PositiveInt = 10 * 1024 * 1024
    image_reference_max_pixels: PositiveInt = 16_000_000
    image_controlnet_enabled: bool = False
    image_controlnet_model_id: str = "xinsir/controlnet-openpose-sdxl-1.0"
    image_controlnet_scale: float = Field(default=0.8, ge=0, le=2)
    enable_warmup: bool = True

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def apply_image_model_preset(self) -> Settings:
        """Apply complete profile settings unless the caller explicitly chooses custom."""
        preset = _IMAGE_MODEL_PRESETS.get(self.image_model_preset)
        if preset is None:
            return self
        for name, value in preset.items():
            setattr(self, name, value)
        return self

    @property
    def image_reference_allowed_host_set(self) -> frozenset[str]:
        return frozenset(
            host.strip().lower().strip("[]") for host in self.image_reference_allowed_hosts.split(",") if host.strip()
        )

    @property
    def image_reference_allowed_port_set(self) -> frozenset[int]:
        ports: set[int] = set()
        for value in self.image_reference_allowed_ports.split(","):
            if not value.strip():
                continue
            try:
                port = int(value.strip())
            except ValueError as error:
                raise ValueError("IMAGE_REFERENCE_ALLOWED_PORTS must contain port numbers.") from error
            if not 1 <= port <= 65535:
                raise ValueError("IMAGE_REFERENCE_ALLOWED_PORTS contains an invalid port.")
            ports.add(port)
        return frozenset(ports)

    @property
    def resolved_image_model_source(self) -> str:
        configured = self.image_model_local_path.strip()
        if not configured:
            return self.image_model_id
        path = Path(configured)
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        return str(path)

    @property
    def resolved_hf_home(self) -> Path:
        path = Path(self.hf_home)
        return path if path.is_absolute() else PROJECT_ROOT / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
