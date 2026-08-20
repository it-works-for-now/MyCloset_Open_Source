from __future__ import annotations

import io
import logging
from dataclasses import dataclass
from urllib.parse import urlsplit

import httpx
from PIL import Image, UnidentifiedImageError

from .config import Settings
from .schemas import ImageItem

logger = logging.getLogger(__name__)

_REFERENCE_SLOT_PRIORITY = (
    "top",
    "outer",
    "bottom",
    "shoes",
    "hat",
    "accessoryTop",
    "accessoryBottom",
    "accessoryShoes",
)
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ReferenceImageFetchError(ValueError):
    """A supplied reference image could not be safely retrieved."""


@dataclass(frozen=True)
class ReferenceImage:
    slot: str
    image: Image.Image
    source_host: str


def validate_reference_url(
    value: str,
    *,
    allowed_hosts: frozenset[str],
    allowed_ports: frozenset[int],
    path_prefix: str,
) -> str:
    """Validate a Backend-owned upload URL before opening a network connection."""
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError as error:
        raise ReferenceImageFetchError("Reference image URL is invalid.") from error

    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ReferenceImageFetchError("Reference image URL must use absolute HTTP(S).")
    if parsed.username or parsed.password or parsed.fragment:
        raise ReferenceImageFetchError("Reference image URL contains unsupported components.")

    host = parsed.hostname.lower()
    if not allowed_hosts or host not in allowed_hosts:
        raise ReferenceImageFetchError("Reference image host is not allowed.")

    effective_port = port or (443 if parsed.scheme == "https" else 80)
    if effective_port not in allowed_ports:
        raise ReferenceImageFetchError("Reference image port is not allowed.")
    if not parsed.path.startswith(path_prefix):
        raise ReferenceImageFetchError("Reference image path is not allowed.")
    return value


class ReferenceImageFetcher:
    """Fetch one safe clothing reference image for IP-Adapter conditioning."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def fetch(self, items: list[ImageItem]) -> ReferenceImage | None:
        candidate = self._select_candidate(items)
        if candidate is None or not self.settings.image_reference_enabled:
            return None

        url = validate_reference_url(
            candidate.imageUrl.strip(),
            allowed_hosts=self.settings.image_reference_allowed_host_set,
            allowed_ports=self.settings.image_reference_allowed_port_set,
            path_prefix=self.settings.image_reference_path_prefix,
        )
        host = urlsplit(url).hostname or ""
        image = self._download_image(url)
        logger.info("Using IP-Adapter reference image: slot=%s host=%s", candidate.slot, host)
        return ReferenceImage(slot=candidate.slot, image=image, source_host=host)

    @staticmethod
    def _select_candidate(items: list[ImageItem]) -> ImageItem | None:
        priority = {slot: index for index, slot in enumerate(_REFERENCE_SLOT_PRIORITY)}
        candidates = [item for item in items if item.imageUrl and item.imageUrl.strip()]
        if not candidates:
            return None
        return min(candidates, key=lambda item: priority.get(item.slot, len(priority)))

    def _download_image(self, url: str) -> Image.Image:
        timeout = httpx.Timeout(float(self.settings.image_reference_timeout_seconds))
        try:
            with (
                httpx.Client(timeout=timeout, follow_redirects=False, trust_env=False) as client,
                client.stream("GET", url, headers={"Accept": "image/jpeg,image/png,image/webp"}) as response,
            ):
                if response.status_code != httpx.codes.OK:
                    raise ReferenceImageFetchError("Reference image server returned an unexpected status.")
                content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
                if content_type not in _ALLOWED_CONTENT_TYPES:
                    raise ReferenceImageFetchError("Reference image content type is not supported.")

                data = bytearray()
                for chunk in response.iter_bytes():
                    data.extend(chunk)
                    if len(data) > self.settings.image_reference_max_bytes:
                        raise ReferenceImageFetchError("Reference image exceeds the size limit.")
        except ReferenceImageFetchError:
            raise
        except httpx.HTTPError as error:
            raise ReferenceImageFetchError("Reference image download failed.") from error

        try:
            with Image.open(io.BytesIO(data)) as opened:
                if opened.width * opened.height > self.settings.image_reference_max_pixels:
                    raise ReferenceImageFetchError("Reference image exceeds the pixel limit.")
                opened.load()
                return opened.convert("RGB").copy()
        except ReferenceImageFetchError:
            raise
        except (Image.DecompressionBombError, UnidentifiedImageError, OSError) as error:
            raise ReferenceImageFetchError("Reference image data is invalid.") from error
